/**
 * What an autosave does, apart from React (JAVA-796): wait for a pause, keep one save in flight, and
 * never drop a change. `useAutosave` is the React face of it.
 *
 * Lifted from Fabula's `useAutoSave`, keeping the two fixes that hook paid for: a change made while
 * a save runs is saved after it instead of being dropped, and the value is taken BEFORE the await so
 * an edit during the save is not cleared with it. What it adds is a status a screen can say out
 * loud, retrying on its own when the network failed, and waiting for the person when it did not.
 */

/**
 * `idle` until the first change; `pending` while a change waits for the pause; `offline` while a
 * save that never reached the server waits to try again; `failed` when the server refused it and
 * only the person can decide (a conflict, lost access, a full allowance).
 */
export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "offline" | "failed";

export interface AutosaveState {
  status: AutosaveStatus;
  /** What the last failed save threw; `null` otherwise. */
  error: unknown;
}

/** How a failed save goes on: `retry` tries again by itself, `stop` waits for `retry()`. */
export type AutosaveFailure = "retry" | "stop";

export interface AutosaveOptions<T> {
  save: (value: T) => Promise<void>;
  /** The pause, in ms, after the last change before it is saved. */
  delay: number;
  classify?: (error: unknown) => AutosaveFailure;
  onStateChange?: (state: AutosaveState) => void;
}

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_CAP_MS = 30_000;

/** A request that never reached the server rejects with a `TypeError`; anything answered is the caller's to judge. */
export function defaultClassify(error: unknown): AutosaveFailure {
  return error instanceof TypeError ? "retry" : "stop";
}

/** 1 s, 2 s, 4 s... up to 30 s between attempts while the network is down. */
export function backoffDelay(attempt: number): number {
  return Math.min(BACKOFF_BASE_MS * 2 ** Math.max(attempt - 1, 0), BACKOFF_CAP_MS);
}

export class AutosaveController<T> {
  /** Boxed, so a falsy value (an empty body) still counts as a change to save. */
  private pending: { value: T } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private saving = false;
  private attempt = 0;
  private enabled = true;
  private disposed = false;
  private state: AutosaveState = { status: "idle", error: null };

  constructor(private options: AutosaveOptions<T>) {}

  /** The latest callbacks, so a re-render never leaves a timer holding an old closure. */
  update(options: AutosaveOptions<T>): void {
    this.options = options;
  }

  get current(): AutosaveState {
    return this.state;
  }

  /** A change: saved after the pause, unless an earlier save failed and waits for the person. */
  schedule(value: T): void {
    this.pending = { value };
    if (this.state.status === "failed" || this.state.status === "offline") return;
    this.set("pending");
    this.arm(this.options.delay);
  }

  /** Saves what is pending now (leaving the page, ⌘S). Resolves once that save settles. */
  async flush(): Promise<void> {
    this.clearTimer();
    if (!this.enabled || !this.pending) return;
    if (this.saving) {
      // A save is in flight: try again after it, never drop the change (Fabula's fix). Once
      // disposed, the end of that save sends the change itself, with no timer left behind.
      if (!this.disposed) this.arm(this.options.delay);
      return;
    }
    const snapshot = this.pending;
    this.saving = true;
    this.set("saving");
    try {
      await this.options.save(snapshot.value);
    } catch (error) {
      this.saving = false;
      this.fail(error);
      return;
    }
    this.saving = false;
    this.attempt = 0;
    if (this.pending === snapshot) {
      this.pending = null;
      this.set("saved");
    } else if (this.disposed) {
      await this.flush();
    } else {
      this.set("pending");
      this.arm(this.options.delay);
    }
  }

  /** The person's "Try again": sends the latest change, whatever stopped the last one. */
  retry(): Promise<void> {
    if (!this.pending) return Promise.resolve();
    this.attempt = 0;
    this.set("pending");
    return this.flush();
  }

  /** The person dropped the change (they took someone else's version): nothing is pending any more. */
  discard(): void {
    this.clearTimer();
    this.pending = null;
    this.attempt = 0;
    this.set("idle");
  }

  /** Back online: a save waiting on the network goes now instead of at its backoff. */
  reconnected(): void {
    if (this.state.status === "offline") void this.flush();
  }

  /** The gate: while false, changes are kept but nothing is sent (one saver per page, JAVA-803). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled && this.pending && this.state.status === "pending") this.arm(this.options.delay);
    if (!enabled) this.clearTimer();
  }

  /** Mounted again (React's strict mode remounts): the controller works as before. */
  attach(): void {
    this.disposed = false;
  }

  /** Unmounting saves what is pending at once instead of dropping it. */
  dispose(): void {
    this.disposed = true;
    if (this.state.status === "pending") void this.flush();
    else this.clearTimer();
  }

  private fail(error: unknown): void {
    const how = (this.options.classify ?? defaultClassify)(error);
    if (how === "retry" && !this.disposed) {
      this.attempt += 1;
      this.set("offline", error);
      this.arm(backoffDelay(this.attempt));
      return;
    }
    this.set("failed", error);
  }

  private arm(ms: number): void {
    this.clearTimer();
    this.timer = setTimeout(() => void this.flush(), ms);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private set(status: AutosaveStatus, error: unknown = null): void {
    this.state = { status, error };
    this.options.onStateChange?.(this.state);
  }
}
