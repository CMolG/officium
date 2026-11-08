import { EXIT_MS, MAX_VISIBLE, resolveDuration, type ToastAction, type ToastOptions, type ToastVariant } from "./toast.shared";

/*
 * The toast state machine, with no React in it (JAVA-1620). `toast.ts` keeps one of these for the
 * page; the viewport reads it through `useSyncExternalStore`.
 *
 * Visible toasts (at most MAX_VISIBLE, exits included) and a FIFO queue. A toast's clock starts when
 * it becomes visible, never while it waits. Every reason to hold the clocks (a mouse over the stack,
 * focus inside it, a hidden tab) stops the whole stack at once: one toast expiring under the cursor
 * would shift its neighbours under it.
 */

export type ToastPause = "pointer" | "focus" | "hidden";

export interface ToastItem {
  id: string;
  /** Bumps on every replace, so the same id is announced again. */
  revision: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  app?: string;
  icon?: string;
  action?: ToastAction;
  cancel?: ToastAction;
  duration: number;
  state: "open" | "closing";
}

export interface ToastSnapshot {
  /** On screen, oldest first. */
  visible: ToastItem[];
  /** Waiting for a free place. */
  queued: number;
}

export interface ToastStore {
  enqueue(title: string, options?: ToastOptions): string;
  dismiss(id?: string): void;
  pause(reason: ToastPause, on: boolean): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): ToastSnapshot;
}

/** Longest delay a timer takes; a longer one would fire at once. */
const MAX_DELAY = 2 ** 31 - 1;

interface Entry {
  item: ToastItem;
  /** Milliseconds left on the clock, as of `started` while the clock runs. */
  left: number;
  started: number;
  timer?: ReturnType<typeof setTimeout>;
  exit?: ReturnType<typeof setTimeout>;
}

const EMPTY: ToastSnapshot = { visible: [], queued: 0 };

function itemFor(id: string, title: string, options: ToastOptions, revision: number): ToastItem {
  return {
    id,
    revision,
    title,
    description: options.description,
    variant: options.variant ?? "default",
    app: options.app,
    icon: options.icon,
    action: options.action,
    cancel: options.cancel,
    duration: resolveDuration(options.duration, `${title}${options.description ?? ""}`),
    state: "open",
  };
}

class ToastQueue implements ToastStore {
  private visible: Entry[] = [];
  private queue: Entry[] = [];
  private holds = new Set<ToastPause>();
  private listeners = new Set<() => void>();
  private snapshot: ToastSnapshot = EMPTY;
  private nextId = 0;

  enqueue = (title: string, options: ToastOptions = {}): string => {
    const id = options.id ?? `toast-${++this.nextId}`;
    const shown = this.visible.find((entry) => entry.item.id === id);
    const waiting = this.queue.find((entry) => entry.item.id === id);
    if (shown) this.replace(shown, title, options);
    else if (waiting) this.replace(waiting, title, options);
    else this.add(id, title, options);
    this.publish();
    return id;
  };

  dismiss = (id?: string): void => {
    if (id === undefined) {
      this.queue = [];
      for (const entry of this.visible) if (entry.item.state === "open") this.beginClose(entry);
      this.publish();
      return;
    }
    const shown = this.visible.find((entry) => entry.item.id === id);
    if (shown) {
      if (shown.item.state === "open") {
        this.beginClose(shown);
        this.publish();
      }
      return;
    }
    const waiting = this.queue.find((entry) => entry.item.id === id);
    if (waiting) {
      this.queue = this.queue.filter((entry) => entry !== waiting);
      this.publish();
    }
  };

  pause = (reason: ToastPause, on: boolean): void => {
    const wasRunning = this.running();
    if (on) this.holds.add(reason);
    else this.holds.delete(reason);
    if (this.running() === wasRunning) return;
    for (const entry of this.visible) {
      if (this.running()) this.start(entry);
      else this.stop(entry);
    }
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ToastSnapshot => this.snapshot;

  private publish() {
    this.snapshot = { visible: this.visible.map((entry) => entry.item), queued: this.queue.length };
    for (const listener of this.listeners) listener();
  }

  private running(): boolean {
    return this.holds.size === 0;
  }

  /** A new toast: it shows if there is a free place, and waits in the queue otherwise. */
  private add(id: string, title: string, options: ToastOptions) {
    const entry: Entry = { item: itemFor(id, title, options, 0), left: 0, started: 0 };
    entry.left = entry.item.duration;
    if (this.visible.length < MAX_VISIBLE) {
      this.visible.push(entry);
      this.start(entry);
    } else this.queue.push(entry);
  }

  /** Replaces a toast in place: same position, a fresh clock, announced again. A closing one comes back. */
  private replace(entry: Entry, title: string, options: ToastOptions) {
    this.stop(entry);
    if (entry.exit !== undefined) {
      clearTimeout(entry.exit);
      entry.exit = undefined;
    }
    entry.item = itemFor(entry.item.id, title, options, entry.item.revision + 1);
    entry.left = entry.item.duration;
    this.start(entry);
  }

  /** Starts the clock of a visible toast. A queued one has no clock until it shows. */
  private start(entry: Entry) {
    if (entry.timer !== undefined || entry.item.state !== "open" || !this.running()) return;
    if (!this.visible.includes(entry) || entry.item.duration === Infinity) return;
    entry.started = Date.now();
    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      this.beginClose(entry);
      this.publish();
    }, Math.min(entry.left, MAX_DELAY));
  }

  private stop(entry: Entry) {
    if (entry.timer === undefined) return;
    clearTimeout(entry.timer);
    entry.timer = undefined;
    entry.left = Math.max(0, entry.left - (Date.now() - entry.started));
  }

  /** Visible toast to closing: it stays in place for EXIT_MS, then leaves and the queue moves up. */
  private beginClose(entry: Entry) {
    this.stop(entry);
    entry.item = { ...entry.item, state: "closing" };
    entry.exit = setTimeout(() => {
      entry.exit = undefined;
      this.visible = this.visible.filter((other) => other !== entry);
      this.promote();
      this.publish();
    }, EXIT_MS);
  }

  private promote() {
    while (this.visible.length < MAX_VISIBLE && this.queue.length > 0) {
      const entry = this.queue.shift() as Entry;
      entry.item = { ...entry.item, state: "open" };
      entry.left = entry.item.duration;
      this.visible.push(entry);
      this.start(entry);
    }
  }
}

export function createToastStore(): ToastStore {
  return new ToastQueue();
}
