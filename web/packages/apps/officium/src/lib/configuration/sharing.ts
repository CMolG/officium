import { ApiError } from "../backlog/api-error";
import type { WriteResult } from "../backlog/types";
import { MEMORY_BACKEND, projectRequest, projectWrite } from "./project-api";

/**
 * Configuration, Sharing (Off-Shell 9.03, owner decision): what a project shows the people it shares its board with.
 * The one setting so far is whether VIEWERS see who did the work (an AI agent or a person, the assignees, who made the
 * last change). It is off until the owner turns it on, so a board can be shared with stakeholders as it is.
 *
 * TODO(backend): GET/PUT /projects/{id}/sharing -> { showWho: boolean, version: number }, readable by every member
 * (viewers included, the board needs it) and written by the owner under `expectedVersion`. Until it exists the read
 * answers `null` and the setting stays off.
 */
export interface SharingSettings {
  showWho: boolean;
  version: number;
}

/** The in-memory build keeps the setting per project, so the whole flow is testable without a server. */
const memory = new Map<string, SharingSettings>();

/** The server does not serve the setting yet when it answers one of these. */
const isMissing = (err: unknown) => err instanceof ApiError && (err.status === 404 || err.status === 501);

/** The project's sharing settings, or `null` when the API does not serve them yet (the setting is then off). */
export async function getSharing(projectId: string): Promise<SharingSettings | null> {
  if (MEMORY_BACKEND) return memory.get(projectId) ?? { showWho: false, version: 0 };
  try {
    return await projectRequest<SharingSettings>(`/projects/${projectId}/sharing`);
  } catch (err) {
    if (isMissing(err)) return null;
    throw err;
  }
}

export async function setSharing(projectId: string, input: { showWho: boolean; expectedVersion: number }): Promise<WriteResult<SharingSettings>> {
  if (MEMORY_BACKEND) {
    const next = { showWho: input.showWho, version: input.expectedVersion + 1 };
    memory.set(projectId, next);
    return next;
  }
  return projectWrite<SharingSettings>(`/projects/${projectId}/sharing`, { method: "PUT", body: JSON.stringify(input) });
}
