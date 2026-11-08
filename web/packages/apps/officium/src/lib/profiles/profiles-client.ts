import { apiUrl } from "@javadaba/sdk/platform";

import { ApiError } from "../backlog/api-error";
import { USES_MEMORY_BACKEND } from "../backlog/get-repository";
import { isConflict, type WriteResult } from "../backlog/types";
import { memoryProfilesClient } from "./memory-profiles";
import type { ProfileUpsert, ProfileView, ProfilesView } from "./profile-types";

/** Work profiles (card://JAVA-1524), against the API or, in the memory build, the tab's own twin. */
export interface ProfilesClient {
  list(projectId?: string): Promise<ProfilesView>;
  get(profileId: string): Promise<ProfileView>;
  upsert(profileId: string, input: ProfileUpsert): Promise<WriteResult<ProfileView>>;
  /** Owner only; `null` goes back to Officium's defaults. `shuffle` turns shuffle mode on or off; left out, it is kept. */
  activate(projectId: string, profileId: string | null, shuffle?: boolean): Promise<ProfilesView>;
}

const BASE = "/api/officium/v1";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(`${BASE}${path}`), {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 409 && body?.error === "version_conflict") {
    return { error: "version_conflict", message: body.message, current: body.current } as T;
  }
  if (!res.ok) throw new ApiError(body?.error ?? `http_${res.status}`, body?.message ?? "The request failed.", res.status);
  return body as T;
}

const apiProfilesClient: ProfilesClient = {
  list: (projectId) => call(`/profiles${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ""}`),
  get: (profileId) => call(`/profiles/${encodeURIComponent(profileId)}`),
  upsert: (profileId, input) => call(`/profiles/${encodeURIComponent(profileId)}`, { method: "PUT", body: JSON.stringify(input) }),
  activate: (projectId, profileId, shuffle) =>
    call(`/projects/${encodeURIComponent(projectId)}/work-profile`, { method: "PUT", body: JSON.stringify({ profileId, shuffle }) }),
};

export function getProfilesClient(): ProfilesClient {
  return USES_MEMORY_BACKEND ? memoryProfilesClient : apiProfilesClient;
}

export { isConflict };
