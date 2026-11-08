"use client";

import type { SummonsHooks } from "./summons-memory";

declare global {
  interface Window {
    /** The mock build has no server to summon from: a spec plays the agent's `summons.send` here. */
    __OFFICIUM_SUMMONS__?: SummonsHooks;
  }
}

/** The web half (JAVA-1145): the handle the mock build's e2e drives. Android's twin is `summons-env.native.ts`. */
export function publishHooks(hooks: SummonsHooks): void {
  window.__OFFICIUM_SUMMONS__ = hooks;
}
