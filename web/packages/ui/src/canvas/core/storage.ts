// packages/ui/src/canvas/core/storage.ts
//
// PROVENANCE NOTE: the plan (#20, Task 4) describes this as a port of
// Fluxor's `src/renderer/logic/debounced-storage.ts` (114 LOC, generic:
// 500ms debounce per key, read-your-writes, flush on
// beforeunload/visibilitychange). Fluxor is out of reading scope in this
// run — this is our own reconstruction from the CONTRACT the plan
// describes, not a literal transcription.
//
// The engine does NOT own persistence (see ADR 0002): this is a utility
// the consumer can use (or not) to write to its own storage with
// debounce; the engine never decides the key or the serialized format.

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

function memoryAdapter(): StorageAdapter {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
  };
}

/** Default adapter over `localStorage`; falls back to an in-memory Map if it does not exist (SSR, node tests). */
export function createLocalStorageAdapter(): StorageAdapter {
  if (typeof localStorage === 'undefined') return memoryAdapter();
  return {
    get: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Quota exceeded or some other storage failure: not fatal to the engine.
      }
    },
  };
}

export interface DebouncedStorageOptions {
  adapter?: StorageAdapter;
  /** Debounce window in ms, per key. Defaults to 500 (same as Fluxor). */
  delay?: number;
}

/**
 * Debounced write per key: bursts of `set(key, ...)` collapse into a
 * single real write to the adapter after `delay` ms of silence. `get`
 * does "read-your-writes": if there is a pending write not yet flushed,
 * that value is returned instead of reading from the adapter (which does
 * not have it yet).
 */
export class DebouncedStorage {
  private readonly adapter: StorageAdapter;
  private readonly delay: number;
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pending = new Map<string, string>();
  private flushHandlersInstalled = false;

  constructor(options: DebouncedStorageOptions = {}) {
    this.adapter = options.adapter ?? createLocalStorageAdapter();
    this.delay = options.delay ?? 500;
    this.installFlushHandlers();
  }

  get(key: string): string | null {
    if (this.pending.has(key)) return this.pending.get(key)!;
    return this.adapter.get(key);
  }

  set(key: string, value: string): void {
    this.pending.set(key, value);
    const existingTimer = this.timers.get(key);
    if (existingTimer) clearTimeout(existingTimer);
    const timer = setTimeout(() => this.flushKey(key), this.delay);
    this.timers.set(key, timer);
  }

  /** Immediately flushes all pending writes (every key). */
  flush(): void {
    for (const key of [...this.pending.keys()]) {
      this.flushKey(key);
    }
  }

  private flushKey(key: string): void {
    const value = this.pending.get(key);
    if (value !== undefined) {
      this.adapter.set(key, value);
      this.pending.delete(key);
    }
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  private installFlushHandlers(): void {
    if (this.flushHandlersInstalled) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    window.addEventListener('beforeunload', () => this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flush();
    });
    this.flushHandlersInstalled = true;
  }
}
