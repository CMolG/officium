import { memoryGate, memoryGateWrittenElsewhere } from "../configuration/memory-integration-gate";
import type { GateRules, GateSettings } from "../configuration/integration-gate";

/** The integration gate's rules, played by a spec (card://JAVA-1851), apart so `mock-test-hooks.ts` stays under its bar. */
export interface GateMockHooks {
  /** Another owner saves these rules over the stored ones: the version moves, so this tab's next save is stale. */
  simulateGateWrite(projectId: string, patch: Partial<GateRules>): GateSettings;
  /** The rules, version and time the twin holds for the project. */
  gateOf(projectId: string): GateSettings;
}

export const gateMockHooks = (): GateMockHooks => ({
  simulateGateWrite: memoryGateWrittenElsewhere,
  gateOf: memoryGate,
});
