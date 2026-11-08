import { beatAutoloop, setAutoloopGate } from "../autoloop/memory-autoloop";
import { gateMockHooks, type GateMockHooks } from "./mock-gate-hooks";

/** The autoloop's supervisor, played by a spec (card://JAVA-1528), apart so `mock-test-hooks.ts` stays under its bar. */
export interface AutoloopMockHooks extends GateMockHooks {
  /** Mirrors `autoloop.heartbeat`: a loop beats `running` or `idle` (`at` in ms backdates it); answers its order. */
  beatAutoloop: typeof beatAutoloop;
  /** Opens the integration gate (card://JAVA-1820) with the given fields over an empty one; null closes it. */
  setAutoloopGate: typeof setAutoloopGate;
}

export const autoloopMockHooks = (): AutoloopMockHooks => ({ beatAutoloop, setAutoloopGate, ...gateMockHooks() });
