/**
 * @javadaba/sdk/shell — host↔app protocol for the iframe app-shell (ADR 0001).
 *
 * Each miniapp is a Next.js app embedded by the Host in a same-domain iframe.
 * The Host drives the lifecycle (init/suspend/resume/serialize/restore/teardown)
 * and the app reports back (ready/notify/requestOpenApp/persistState/title/badge).
 *
 * Three helpers, all framework-agnostic:
 *   - createAppBridge(appId, handlers)           → used INSIDE the app (the iframe)
 *   - createAppBridgeIfEmbedded(appId, handlers) → same, but null if not embedded
 *   - createHostPort(iframe, appId, on)          → used by the HOST (window manager)
 */

export const SHELL_PROTOCOL_VERSION = 1;

export interface AppDeeplink {
  /** Sub-view within the app, e.g. "post". */
  view?: string;
  /** Arbitrary string params, e.g. { id: "123" }. */
  params?: Record<string, string>;
}

export interface AppTheme {
  mode: "light" | "dark";
  /** Optional accent the app may honor. */
  accent?: string;
}

export type NotifyLevel = "info" | "success" | "warning" | "error";

/** One entry of an app's own menu. `id` comes back to the app as a `command` when it is chosen. */
export interface AppMenuItem {
  id: string;
  label: string;
  /** Display only, in the shared `Mod+Shift+N` notation; the app binds the key itself. */
  shortcut?: string;
  checked?: boolean;
  disabled?: boolean;
}

export type AppMenuEntry = AppMenuItem | { separator: true };

/** A menu the app adds to the menu bar after its name ("Playback" for Sonus, "Post" for Aura). */
export interface AppMenu {
  id: string;
  label: string;
  items: AppMenuEntry[];
}

/** A guided tour the app can run again from the host's Help menu and the window's help button. */
export interface AppTour {
  id: string;
  name: string;
}

/**
 * The small piece an app draws for Picture in picture (OS-Windows, "Each app draws its own"): what
 * it is showing, in a few lines, with at most one action. The host places it, keeps it above the
 * windows and remembers its corner; it never invents content of its own.
 *
 * What each app puts in it (OS-Windows, "Picture in picture, by app"). The few controls worth keeping
 * while the window is away; an app that sends nothing (`setPip(null)`) never offers the button.
 *
 * | App | title | detail | caption / progress | status, action |
 * | --- | --- | --- | --- | --- |
 * | Sonus | song or station | artist, station | none | `ON AIR`, `media.toggle` (sent with `setMedia`, the host lays it out) |
 * | Officium | "OFF-24 · Add CSV export" | "Builder is working on it · step 3 of 5" | none | "Working now" |
 * | Fluxor | flow name | "Step 4 of 7 · Summarize the changes" | "Running · 2 min" | none |
 * | Theatrum | "Episode 2 · Shot 4" | "Generating" | progress, "N of N" | none |
 * | Adiutor | "Next: call with ..." | the time | "In 25 minutes · subject" | none |
 * | Gymnasium | "Squat · set 3 of 4" | the rest timer | none | pause or resume |
 * | Curriculum | "Tailoring your resume" | role and company | the step ("Rewriting the summary") | none |
 * | Fabula | chapter | words today | progress toward the day's goal | none |
 * | Tributa | invoice number | amount | "awaiting payment" and the due date (in Spanish, Tributa's language) | none |
 * | Quaestio | survey name | response count | "3 new" | "Live, as they land" |
 * | Creatio | component name | "Live component" | none | none |
 * | Aura | "Your tribe" | "3 new posts since you looked" | none | none |
 * | Album | album name | "Uploading 12 of 40 photos" | progress | none |
 *
 * Text is the app's own and in the person's language; the host trims it to one line each and draws
 * `status` as a word, never only a color.
 */
export interface PipWidget {
  /** The bold line: "Add CSV export", "Squat · set 3 of 4". */
  title: string;
  /** The line under it: "Builder is working on it · step 3 of 5". */
  detail?: string;
  /** A third line, smaller: "10:00 · In 25 minutes". */
  caption?: string;
  /** 0 to 1, drawn as a bar; null or absent draws none. */
  progress?: number | null;
  /** A word on a chip, so state is never only a color: "Working now", "ON AIR". */
  status?: { label: string; tone?: "live" | "working" | "attention" };
  /** An image drawn at the start (a cover, an avatar). */
  art?: string;
  /** Moving bars, for audio that is playing. */
  bars?: boolean;
  /** The one control worth keeping while the window is away. Chosen, it comes back as a `command`. */
  action?: { id: string; label: string; icon: "play" | "pause" };
}

/**
 * What a media app is playing, for the host's now-playing widget and picture in picture. The host
 * sends `command` messages back: "media.toggle" (play or pause), "media.next", "media.previous".
 */
export interface MediaState {
  /** The song (or the station, when no song is known). */
  title: string;
  /** The artist, or the station when the title is the song. */
  subtitle?: string;
  /** The genre or the line under the station. */
  detail?: string;
  playing: boolean;
  /** Radio: no seeking, and the host says LIVE. */
  live?: boolean;
  /** The station could not be reached ("isn't responding"). */
  stalled?: boolean;
  art?: string;
  /** The station's name when `title` is the song: the widget shows both. */
  station?: string;
}

/** Host → app. */
export type HostToAppMessage =
  | { type: "command"; id: string }
  | { type: "init"; protocol: number; deeplink?: AppDeeplink; theme?: AppTheme }
  | { type: "suspend" }
  | { type: "resume" }
  | { type: "serialize"; requestId: string }
  | { type: "restore"; state: unknown }
  | { type: "teardown" }
  | { type: "theme"; theme: AppTheme }
  | { type: "focus" }
  | { type: "blur" };

/** App → host. */
export type AppToHostMessage =
  | { type: "ready"; protocol: number }
  | { type: "requestOpenApp"; appId: string; deeplink?: AppDeeplink }
  | { type: "notify"; title: string; body?: string; level?: NotifyLevel }
  | { type: "persistState"; state: unknown }
  | { type: "serialized"; requestId: string; state: unknown }
  | { type: "title"; title: string }
  | { type: "badge"; count: number | null }
  /**
   * The app has work that closing would lose ("Chapter 3" is not saved), or no longer does
   * (`null`). The host asks before closing the window while it is set: Keep editing or Close
   * without saving. The description names what would be lost, in the app's words.
   */
  | { type: "unsaved"; description: string | null }
  /**
   * The menus the app adds to the menu bar while its window is in front (`[]` removes them). Choosing
   * an entry comes back as a host → app `command` with the entry's id.
   */
  | { type: "menus"; menus: AppMenu[] }
  /** The guided tours the app can run again (`[]`: none). The host asks with `command` "tour.start:<id>". */
  | { type: "tours"; tours: AppTour[] }
  /** The app's Picture in picture piece; `null` withdraws it, and the window then offers none. */
  | { type: "pip"; widget: PipWidget | null }
  /** What the app is playing, for the now-playing widget and picture in picture; `null`: nothing. */
  | { type: "media"; media: MediaState | null }
  /**
   * A user fact that may unlock an achievement ("cognitive profile completed").
   *
   * Exists because the Host's gamification contract is a `CustomEvent` on ITS OWN
   * `window` (`javadaba:event`, see `GamificationBridge`), and since ADR 0001 every
   * miniapp lives in an iframe: a `dispatchEvent` inside the iframe never reaches
   * the Host. Measured on 2026-08-09: ZERO apps were emitting the event, and it
   * wasn't neglect — the contract simply never crossed the boundary.
   *
   * The app does NOT decide the reward: it only declares that something happened.
   * If there's no `achievement_definition` with that trigger, the event gets
   * logged and unlocks nothing, which is exactly the behavior wanted while nobody
   * has decided whether that fact deserves a credit.
   */
  | { type: "event"; event: string; amount?: number };

/** postMessage envelope so shell traffic is unambiguous. */
export interface ShellEnvelope<T> {
  __javadaba_shell: true;
  appId: string;
  payload: T;
}

function isEnvelope(data: unknown, appId: string): data is ShellEnvelope<unknown> {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { __javadaba_shell?: unknown }).__javadaba_shell === true &&
    (data as { appId?: unknown }).appId === appId
  );
}

function wrap<T>(appId: string, payload: T): ShellEnvelope<T> {
  return { __javadaba_shell: true, appId, payload };
}

/* ── App side (runs inside the iframe) ──────────────────────────────────── */

export interface AppBridgeHandlers {
  onInit?(init: { deeplink?: AppDeeplink; theme?: AppTheme }): void;
  onSuspend?(): void;
  onResume?(): void;
  onRestore?(state: unknown): void;
  onTeardown?(): void;
  onTheme?(theme: AppTheme): void;
  onFocus?(): void;
  onBlur?(): void;
  /**
   * The host asks for something the app offered: a chosen menu entry, a picture in picture or widget
   * control ("media.toggle"), or "tour.start:<id>". Unknown ids are ignored.
   */
  onCommand?(id: string): void;
  /** Return the current serializable state when the Host requests a freeze. */
  getState?(): unknown;
}

export interface AppBridge {
  /** Announce the app is mounted and listening. */
  ready(): void;
  notify(title: string, opts?: { body?: string; level?: NotifyLevel }): void;
  requestOpenApp(appId: string, deeplink?: AppDeeplink): void;
  persistState(state: unknown): void;
  setTitle(title: string): void;
  setBadge(count: number | null): void;
  /** Tells the host that closing would lose work (or no longer would, with null). */
  setUnsaved(description: string | null): void;
  /** Adds the app's own menus to the menu bar while its window is in front. */
  setMenus(menus: AppMenu[]): void;
  /** Lists the guided tours the host can offer again from Help and the window's help button. */
  setTours(tours: AppTour[]): void;
  /** Draws the app's Picture in picture piece (null withdraws it: the window then offers none). */
  setPip(widget: PipWidget | null): void;
  /** Tells the host what is playing, for the now-playing widget and picture in picture. */
  setMedia(media: MediaState | null): void;
  /** Declares a user fact to the Host (gamification). See `AppToHostMessage["event"]`. */
  recordEvent(event: string, amount?: number): void;
  /** Stop listening (call on unmount). */
  destroy(): void;
}

export interface AppBridgeOptions {
  /** Expected Host origin. Defaults to the embedding parent's origin ("*" only in dev). */
  hostOrigin?: string;
  /** window override (tests). */
  win?: Window;
}

export function createAppBridge(
  appId: string,
  handlers: AppBridgeHandlers,
  options: AppBridgeOptions = {},
): AppBridge {
  const win = options.win ?? (globalThis as unknown as Window);
  const targetOrigin = options.hostOrigin ?? "*";
  const parent = win.parent;

  function send(payload: AppToHostMessage) {
    parent?.postMessage(wrap(appId, payload), targetOrigin);
  }

  function onMessage(event: MessageEvent) {
    if (!isEnvelope(event.data, appId)) return;
    const msg = event.data.payload as HostToAppMessage;
    switch (msg.type) {
      case "init":
        handlers.onInit?.({ deeplink: msg.deeplink, theme: msg.theme });
        break;
      case "suspend":
        handlers.onSuspend?.();
        break;
      case "resume":
        handlers.onResume?.();
        break;
      case "serialize":
        send({ type: "serialized", requestId: msg.requestId, state: handlers.getState?.() ?? null });
        break;
      case "restore":
        handlers.onRestore?.(msg.state);
        break;
      case "teardown":
        handlers.onTeardown?.();
        break;
      case "theme":
        handlers.onTheme?.(msg.theme);
        break;
      case "focus":
        handlers.onFocus?.();
        break;
      case "blur":
        handlers.onBlur?.();
        break;
      case "command":
        handlers.onCommand?.(msg.id);
        break;
    }
  }

  win.addEventListener("message", onMessage);

  return {
    ready: () => send({ type: "ready", protocol: SHELL_PROTOCOL_VERSION }),
    notify: (title, opts) => send({ type: "notify", title, body: opts?.body, level: opts?.level }),
    requestOpenApp: (id, deeplink) => send({ type: "requestOpenApp", appId: id, deeplink }),
    persistState: (state) => send({ type: "persistState", state }),
    setTitle: (title) => send({ type: "title", title }),
    setBadge: (count) => send({ type: "badge", count }),
    setUnsaved: (description) => send({ type: "unsaved", description }),
    setMenus: (menus) => send({ type: "menus", menus }),
    setTours: (tours) => send({ type: "tours", tours }),
    setPip: (widget) => send({ type: "pip", widget }),
    setMedia: (media) => send({ type: "media", media }),
    recordEvent: (event, amount) => send({ type: "event", event, amount }),
    destroy: () => win.removeEventListener("message", onMessage),
  };
}

/**
 * Same as `createAppBridge`, but returns `null` when the app is NOT embedded —
 * no `window` (SSR) or no Host above it (`window.parent === window`).
 *
 * It's the shape a Next.js miniapp needs: the same `/app` route renders on the
 * server and also opens standalone in the browser, and in neither of those two
 * cases should it talk over `postMessage` (without a Host, `parent` is the
 * window itself and the app would end up sending messages to itself). The
 * pattern at the call site is `bridge?.ready()` / `return () => bridge?.destroy()`.
 */
export function createAppBridgeIfEmbedded(
  appId: string,
  handlers: AppBridgeHandlers,
  options: AppBridgeOptions = {},
): AppBridge | null {
  const win = options.win ?? (typeof window === "undefined" ? undefined : window);
  if (!win || win.parent === win) return null;
  return createAppBridge(appId, handlers, { ...options, win });
}

/* ── Host side (window manager) ─────────────────────────────────────────── */

export interface HostPort {
  send(message: HostToAppMessage): void;
  /** Ask the app to serialize; resolves with its state (or rejects on timeout). */
  serialize(timeoutMs?: number): Promise<unknown>;
  destroy(): void;
}

export function createHostPort(
  iframe: HTMLIFrameElement,
  appId: string,
  onMessage: (message: AppToHostMessage) => void,
  options: { appOrigin?: string; win?: Window } = {},
): HostPort {
  const win = options.win ?? (globalThis as unknown as Window);
  const targetOrigin = options.appOrigin ?? "*";
  const pendingSerialize = new Map<string, (state: unknown) => void>();

  function handle(event: MessageEvent) {
    if (event.source !== iframe.contentWindow) return;
    if (!isEnvelope(event.data, appId)) return;
    const msg = event.data.payload as AppToHostMessage;
    if (msg.type === "serialized") {
      pendingSerialize.get(msg.requestId)?.(msg.state);
      pendingSerialize.delete(msg.requestId);
      return;
    }
    onMessage(msg);
  }

  win.addEventListener("message", handle);

  function send(message: HostToAppMessage) {
    iframe.contentWindow?.postMessage(wrap(appId, message), targetOrigin);
  }

  return {
    send,
    serialize(timeoutMs = 2000) {
      const requestId = Math.random().toString(36).slice(2);
      return new Promise<unknown>((resolve) => {
        const timer = setTimeout(() => {
          pendingSerialize.delete(requestId);
          resolve(null);
        }, timeoutMs);
        pendingSerialize.set(requestId, (state) => {
          clearTimeout(timer);
          resolve(state);
        });
        send({ type: "serialize", requestId });
      });
    },
    destroy() {
      win.removeEventListener("message", handle);
      pendingSerialize.clear();
    },
  };
}
