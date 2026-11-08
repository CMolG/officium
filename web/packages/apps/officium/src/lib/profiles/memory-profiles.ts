// The tab's twin of `WorkProfileService` (card://JAVA-1524), for the memory build (the demo and the e2e suite):
// one account's profiles, built-ins included, and the profile each project has active, which the in-memory
// repository's matrix reads (`activeProfileMatrix`) the way `RoleMatrixService.effective` does.
import { ApiError } from "../backlog/api-error";
import { DEFAULT_ROLE_MATRIX } from "../backlog/role-config";
import { overlay } from "../backlog/role-matrix";
import type { RoleMatrix } from "../backlog/role-matrix-types";
import { ownerCanEdit } from "../billing/owner-plan";
import { BUILTIN_NAMES, ECO, STANDARD, ecoOverrides, standardOverrides } from "./builtins";
import type { ProfilesClient } from "./profiles-client";
import type { ProfileView, ProfilesView } from "./profile-types";

interface Stored {
  name: string;
  overrides: RoleMatrix;
  version: number;
  updatedAt: string;
}

const EMPTY: RoleMatrix = { categories: {}, signals: {}, runs: {}, mods: {} };
const ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const stored = new Map<string, Stored>();
const active = new Map<string, string>();
/** Projects with shuffle mode on (JAVA-1858). */
const shuffled = new Set<string>();

const rows = () => [...Object.keys(DEFAULT_ROLE_MATRIX.categories)];

function builtin(id: string): Stored | null {
  if (id === STANDARD) return { name: BUILTIN_NAMES[STANDARD], overrides: standardOverrides(rows()), version: 0, updatedAt: "" };
  if (id === ECO) return { name: BUILTIN_NAMES[ECO], overrides: ecoOverrides(rows()), version: 0, updatedAt: "" };
  return null;
}

const find = (id: string): Stored | null => stored.get(id) ?? builtin(id);

function view(id: string, profile: Stored): ProfileView {
  const isBuiltin = builtin(id) !== null;
  return structuredClone({
    id,
    name: profile.name,
    builtin: isBuiltin,
    customized: isBuiltin && profile.version > 0,
    version: profile.version,
    updatedAt: profile.updatedAt || null,
    overrides: profile.overrides,
    matrix: overlay(DEFAULT_ROLE_MATRIX, profile.overrides),
  });
}

/** The profile a project runs under, null under the defaults (card://JAVA-1527's phase runs read it). */
export const activeProfileId = (projectId: string): string | null => active.get(projectId) ?? null;

/** The matrix under a project's own cells: its active profile's, or the defaults. */
export function activeProfileMatrix(projectId: string): RoleMatrix {
  const id = active.get(projectId);
  const profile = id ? profileUnderPlan(id) : null;
  return profile ? overlay(DEFAULT_ROLE_MATRIX, profile.overrides) : DEFAULT_ROLE_MATRIX;
}

/** Under a lapsed plan a built-in reads as shipped and a customized one as absent (JAVA-1007): the copy is kept. */
const profileUnderPlan = (id: string): Stored | null => (ownerCanEdit() ? find(id) : builtin(id));

async function list(projectId?: string): Promise<ProfilesView> {
  const ids = [STANDARD, ECO, ...[...stored.keys()].filter((id) => !builtin(id))];
  const activeId = projectId ? active.get(projectId) ?? null : null;
  return {
    projectId: projectId ?? null,
    profiles: ids.map((id) => {
      const { overrides: _o, matrix: _m, ...summary } = view(id, find(id) as Stored);
      return { ...summary, active: id === activeId };
    }),
    active: activeId
      ? { profileId: activeId, name: (find(activeId) as Stored).name, yours: true, activatedAt: new Date().toISOString(), shuffle: shuffled.has(projectId as string) }
      : null,
    editable: ownerCanEdit(),
  };
}

export const memoryProfilesClient: ProfilesClient = {
  list,
  async get(profileId) {
    const profile = find(profileId);
    if (!profile) throw new ApiError("profile_not_found", `You have no work profile ${profileId}`, 404);
    return view(profileId, profile);
  },
  async upsert(profileId, input) {
    if (!ID.test(profileId)) throw new ApiError("invalid_profile_id", "A profile id is lowercase letters, digits and hyphens", 400);
    const current = find(profileId);
    if ((current?.version ?? 0) !== input.expectedVersion) {
      return { error: "version_conflict", message: "The work profile changed since you last read it", current: current ? view(profileId, current) : (null as never) };
    }
    if (input.reset) {
      stored.delete(profileId);
      return view(profileId, find(profileId) as Stored);
    }
    const name = (input.name ?? current?.name ?? "").trim();
    if (!name) throw new ApiError("invalid_profile_name", "A profile's name is 1 to 80 characters", 400);
    const base = current?.overrides ?? EMPTY;
    const overrides = input.overrides ? overlay(base, input.overrides) : base;
    // Customizing is the paid part (JAVA-1007): a write that changes a cell needs the plan; a re-save of the same cells does not.
    if (!ownerCanEdit() && JSON.stringify(overrides) !== JSON.stringify(base)) {
      throw new ApiError("plan_required", "Changing roles, models and efforts per category is part of the Personal plan", 403);
    }
    const next: Stored = {
      name,
      overrides,
      version: (stored.get(profileId)?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    stored.set(profileId, next);
    return view(profileId, next);
  },
  async activate(projectId, profileId, shuffle) {
    const { getSharedBacklogRepository } = await import("../backlog/memory-repository");
    const project = await getSharedBacklogRepository().getProject(projectId);
    if (project.role !== "owner") throw new ApiError("read_only", "Only the project's owner sets its work profile", 403);
    if (profileId && !find(profileId)) throw new ApiError("profile_not_found", `You have no work profile ${profileId}`, 404);
    if (profileId) active.set(projectId, profileId);
    else active.delete(projectId);
    if (!profileId || shuffle === false) shuffled.delete(projectId);
    else if (shuffle) shuffled.add(projectId);
    return list(projectId);
  },
};
