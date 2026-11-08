import type { Priority, WriteResult } from "../backlog/types";
import { memoryGate, memorySetGate } from "./memory-integration-gate";
import { MEMORY_BACKEND, projectRequest, projectWrite } from "./project-api";

/**
 * `GET`/`PUT /projects/{id}/integration-gate` (JAVA-1820): three rules that stop the autoloop when work piles up
 * behind a branch nobody merged. Every rule is off until the owner turns it on.
 */
export interface GateRules {
  heldByDeploy: { enabled: boolean; minPriority: Priority };
  deployQueue: { enabled: boolean; max: number };
  nothingElse: { enabled: boolean };
}

export interface GateSettings {
  rules: GateRules;
  version: number;
  updatedAt: string | null;
}

export async function getGate(projectId: string): Promise<GateSettings> {
  if (MEMORY_BACKEND) return memoryGate(projectId);
  return projectRequest<GateSettings>(`/projects/${projectId}/integration-gate`);
}

export async function setGate(projectId: string, input: { expectedVersion: number; rules: GateRules }): Promise<WriteResult<GateSettings>> {
  if (MEMORY_BACKEND) return memorySetGate(projectId, input);
  return projectWrite<GateSettings>(`/projects/${projectId}/integration-gate`, { method: "PUT", body: JSON.stringify(input) });
}
