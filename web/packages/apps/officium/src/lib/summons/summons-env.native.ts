import type { SummonsHooks } from "./summons-memory";

/** Android's half of `summons-env.ts` (JAVA-1145): there is no mock build to drive. */
export function publishHooks(_hooks: SummonsHooks): void {}
