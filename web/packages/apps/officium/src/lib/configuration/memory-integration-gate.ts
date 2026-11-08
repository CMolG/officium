// The tab's twin of `IntegrationGateService` (JAVA-1851), for the memory build (the demo and the e2e suite): one gate
// per project, versioned from 0, written in the server's order: owner check, then the rules' validity, then the version.
import { ApiError } from "../backlog/api-error";
import { getSharedBacklogRepository } from "../backlog/memory-repository";
import type { WriteResult } from "../backlog/types";
import type { GateRules, GateSettings } from "./integration-gate";

export const GATE_OFF: GateSettings = {
  rules: {
    heldByDeploy: { enabled: false, minPriority: "high" },
    deployQueue: { enabled: false, max: 5 },
    nothingElse: { enabled: false },
  },
  version: 0,
  updatedAt: null,
};

const gates = new Map<string, GateSettings>();

export const memoryGate = (projectId: string): GateSettings => gates.get(projectId) ?? GATE_OFF;

/** What the server answers a bad queue size: 422 naming the field. */
function validate(rules: GateRules) {
  const max = rules.deployQueue.max;
  if (!Number.isInteger(max) || max < 1 || max > 500) {
    throw new ApiError("integration_gate_invalid", "deployQueue.max must be a whole number from 1 to 500", 422, { field: "deployQueue.max" });
  }
}

function store(projectId: string, rules: GateRules): GateSettings {
  const next = { rules, version: memoryGate(projectId).version + 1, updatedAt: new Date().toISOString() };
  gates.set(projectId, next);
  return next;
}

export async function memorySetGate(
  projectId: string,
  input: { expectedVersion: number; rules: GateRules },
): Promise<WriteResult<GateSettings>> {
  const project = await getSharedBacklogRepository().getProject(projectId);
  if (project?.role !== "owner") throw new ApiError("forbidden", "Only a project owner can change the integration gate", 403);
  validate(input.rules);
  const current = memoryGate(projectId);
  if (current.version !== input.expectedVersion) {
    return { error: "version_conflict", message: "The integration gate changed since you last read it", current };
  }
  return store(projectId, input.rules);
}

/** The test hook's lever: another owner saving the gate, so the next save of this tab is stale. */
export function memoryGateWrittenElsewhere(projectId: string, patch: Partial<GateRules>): GateSettings {
  return store(projectId, { ...memoryGate(projectId).rules, ...patch });
}
