// Work profiles (card://JAVA-1524): the wire shapes of profiles.list, profiles.get, profiles.upsert and
// profiles.activate. Type-only imports, so node's test runner loads the modules that use them as they are.
import type { RoleMatrix } from "../backlog/role-matrix-types";

/** One profile in a list. `customized`: a built-in this account edited; `active`: the project runs on it. */
export interface ProfileSummary {
  id: string;
  name: string;
  builtin: boolean;
  customized: boolean;
  version: number;
  updatedAt: string | null;
  active: boolean;
}

/** A project's active profile: its name, whether it is the caller's own, and whether shuffle mode is on (JAVA-1858). */
export interface ActiveProfile {
  profileId: string;
  name: string;
  yours: boolean;
  activatedAt: string;
  shuffle: boolean;
}

/** `editable`: the caller's plan lets them customize a profile (JAVA-1007). */
export interface ProfilesView {
  projectId: string | null;
  profiles: ProfileSummary[];
  active: ActiveProfile | null;
  editable: boolean;
}

/** `overrides`: what the profile changes on the defaults; `matrix`: the full matrix it gives a project. */
export interface ProfileView {
  id: string;
  name: string;
  builtin: boolean;
  customized: boolean;
  version: number;
  updatedAt: string | null;
  overrides: RoleMatrix;
  matrix: RoleMatrix;
}

/** A write: `overrides` names the cells it changes, the rest are kept; `reset` drops a built-in's copy. */
export interface ProfileUpsert {
  expectedVersion: number;
  name?: string;
  overrides?: RoleMatrix;
  reset?: boolean;
}
