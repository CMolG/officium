import type { InMemoryBacklogRepository } from "./memory-repository";

/**
 * What a production build resolves for the in-memory backend. The memory build swaps this file
 * for `memory-backend.memory.ts` (next.config.ts, `turbopack.resolveExtensions`), so the fake
 * backend and the editor code its rules import stay out of every route's first read (JAVA-1667).
 * A guarded `require` cannot do this: the bundler keeps a required module in the initial chunks
 * whether or not its branch runs.
 */
export function getSharedBacklogRepository(): InMemoryBacklogRepository {
  throw new Error("The in-memory backend is built only with NEXT_PUBLIC_OFFICIUM_BACKEND=memory");
}
