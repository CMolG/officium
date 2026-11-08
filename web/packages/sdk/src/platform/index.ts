/**
 * `@javadaba/sdk/platform` — the browser, behind a seam (JAVA-103, ADR 0015).
 *
 * An app surface that reads `window`, `document` or `navigator` directly cannot move to Android:
 * React Native has no DOM, and the same call has a different home there (visibility is
 * `AppState`, the clipboard is `expo-clipboard`, an API call has no origin to be relative to).
 * This file is the web half; `index.native.ts` is the Android half, picked by Metro through the
 * `react-native` export condition. Both export the same names with the same signatures.
 *
 * The native-subset ratchet (`browser-global`) lets a file read the browser globals only when it
 * is the web half of such a pair, so everything else comes through here.
 */

/** True where there is a DOM: the browser, never the server render and never Android. */
export const hasDom = (): boolean => typeof window !== "undefined";

// ── The API origin ──────────────────────────────────────────────────────────────────────────────

let apiOrigin = "";

/**
 * Where `/api` lives. On the web it stays empty: every call is same-origin and relative, which is
 * what keeps the `jdb_session` cookie first-party. Android has no origin, so its entry point sets
 * the absolute one (the dev API, or production) once at start.
 */
export function configureApiOrigin(origin: string): void {
  apiOrigin = origin.replace(/\/+$/, "");
}

/** `apiUrl("/api/account/v1/auth/me")`: relative on the web, absolute where an origin was set. */
export function apiUrl(path: string): string {
  return apiOrigin + path;
}

/** What a native sign-in hands the transport; the web has the cookie and takes none (see index.native.ts). */
export type { ApiAuth } from "./bearer-fetch.ts";

/** The web session is the `jdb_session` cookie, so there is nothing to configure. */
export function configureApiAuth(_auth: import("./bearer-fetch.ts").ApiAuth | null): void {}

/** A call to the API carrying the session: the cookie here, the bearer on Android. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), { credentials: "include", ...init });
}

// ── App events (the shell bridge's in-page half, `doc://contracts/shell-bridge`) ─────────

/** Announces an event every listener in this page hears (`AUTH_EVENT`, `ANNOUNCE_EVENT`, …). */
export function emitAppEvent(name: string, detail?: unknown): void {
  if (!hasDom()) return;
  window.dispatchEvent(detail === undefined ? new Event(name) : new CustomEvent(name, { detail }));
}

export function onAppEvent(name: string, listener: (detail: unknown) => void): () => void {
  if (!hasDom()) return () => {};
  const handler = (event: Event) => listener((event as CustomEvent).detail);
  window.addEventListener(name, handler);
  return () => window.removeEventListener(name, handler);
}

// ── Foreground and visibility ───────────────────────────────────────────────────────────────────

/** Whether the app is out of sight — the condition every poll pauses on (`architecture.md`). */
export function isHidden(): boolean {
  return hasDom() && document.hidden;
}

/** Fires with the new state when the app is hidden or shown again. */
export function onVisibilityChange(listener: (hidden: boolean) => void): () => void {
  if (!hasDom()) return () => {};
  const handler = () => listener(document.hidden);
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}

/** Fires when the app comes back to the front: window focus here, `AppState` "active" there. */
export function onForeground(listener: () => void): () => void {
  if (!hasDom()) return () => {};
  window.addEventListener("focus", listener);
  return () => window.removeEventListener("focus", listener);
}

// ── Presence: visible and focused ───────────────────────────────────────────────────────────────

/** Whether the app has the user's focus: the window's here, `AppState` "active" on Android. */
export function isFocused(): boolean {
  return hasDom() && document.hasFocus();
}

/** Fires with the new state when the app gains or loses focus. */
export function onFocusChange(listener: (focused: boolean) => void): () => void {
  if (!hasDom()) return () => {};
  const onFocus = () => listener(true);
  const onBlur = () => listener(false);
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onBlur);
  };
}

/** What a device reports about itself: on screen, and holding the user's focus. */
export type PresenceState = { visible: boolean; focused: boolean };

export function presenceState(): PresenceState {
  return { visible: !isHidden(), focused: isFocused() };
}

/** Fires with the new {@link PresenceState} whenever visibility or focus changes it. */
export function onPresenceChange(listener: (state: PresenceState) => void): () => void {
  let last = presenceState();
  const emit = () => {
    const next = presenceState();
    if (next.visible === last.visible && next.focused === last.focused) return;
    last = next;
    listener(next);
  };
  const stopVisibility = onVisibilityChange(emit);
  const stopFocus = onFocusChange(emit);
  return () => {
    stopVisibility();
    stopFocus();
  };
}

// ── Keeping the screen on ───────────────────────────────────────────────────────────────────────

/** What happened to a {@link keepAwake} hold, for the app to log: nothing here is swallowed. */
export type KeepAwakeEvent =
  | { type: "held" }
  | { type: "released"; by: "app" | "system" }
  | { type: "rejected"; reason: string }
  | { type: "unsupported" };

/**
 * Keeps the screen on until the returned function is called: the Screen Wake Lock here,
 * `expo-keep-awake` on Android. The browser drops the lock whenever the page is hidden, so it is
 * taken again each time the page is shown. Each call is its own hold, so a hold released while
 * its request is still in flight releases that lock on arrival and never touches a newer hold
 * (card://JAVA-528: one shared "please release" flag lost the lock for good on a quick
 * pause-and-resume while it played).
 */
export function keepAwake(onEvent: (event: KeepAwakeEvent) => void = () => {}): () => void {
  if (!hasDom() || !("wakeLock" in navigator)) {
    onEvent({ type: "unsupported" });
    return () => {};
  }
  let wanted = true;
  let pending = false;
  let sentinel: WakeLockSentinel | null = null;
  const acquire = async () => {
    if (!wanted || pending || sentinel || document.hidden) return;
    pending = true;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (!wanted) {
        void lock.release();
        return;
      }
      sentinel = lock;
      lock.addEventListener("release", () => {
        sentinel = null;
        onEvent({ type: "released", by: wanted ? "system" : "app" });
      });
      onEvent({ type: "held" });
    } catch (error) {
      const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      onEvent({ type: "rejected", reason });
    } finally {
      pending = false;
    }
  };
  const stopWatching = onVisibilityChange((hidden) => {
    if (!hidden) void acquire();
  });
  void acquire();
  return () => {
    wanted = false;
    stopWatching();
    void sentinel?.release();
  };
}

// ── Media queries ───────────────────────────────────────────────────────────────────────────────

/** The one preference the ecosystem honours everywhere (`useVisualPerformance`). */
export function prefersReducedMotion(): boolean {
  return hasDom() && typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function onReducedMotionChange(listener: (reduced: boolean) => void): () => void {
  if (!hasDom() || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => listener(query.matches);
  query.addEventListener("change", handler);
  return () => query.removeEventListener("change", handler);
}

// ── The viewport ────────────────────────────────────────────────────────────────────────────────

/** The window's size, before a container can be measured; `null` during the server render. */
export function viewportSize(): { w: number; h: number } | null {
  return hasDom() ? { w: window.innerWidth, h: window.innerHeight } : null;
}

/** Fires when the window changes size: a resize here, rotation and split-screen on Android. */
export function onViewportResize(listener: () => void): () => void {
  if (!hasDom()) return () => {};
  window.addEventListener("resize", listener);
  return () => window.removeEventListener("resize", listener);
}

// ── Keyboard and focus ──────────────────────────────────────────────────────────────────────────

/** A page-wide shortcut. A desktop affordance: on Android it listens to nothing. */
export function onKeyDown(listener: (event: KeyboardEvent) => void): () => void {
  if (!hasDom()) return () => {};
  window.addEventListener("keydown", listener);
  return () => window.removeEventListener("keydown", listener);
}

/** The key that closes the layer on top: Escape here, the system Back on Android. */
export function onDismissKey(listener: () => void): () => void {
  return onKeyDown((event) => {
    if (event.key === "Escape") listener();
  });
}

export function focusedElement(): HTMLElement | null {
  return hasDom() ? (document.activeElement as HTMLElement | null) : null;
}

/** Where floating layers portal to when nothing narrower is given: the page body; `null` on the server. */
export function portalRoot(): HTMLElement | null {
  return hasDom() ? document.body : null;
}

// ── Storage ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Asks the browser not to evict this origin's storage (IndexedDB, Cache) under pressure — what
 * an app holding the only copy of someone's work asks for. Best-effort: `false` when denied or
 * unsupported, never a throw.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!hasDom() || typeof navigator.storage?.persist !== "function") return false;
  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// ── Clipboard and share ─────────────────────────────────────────────────────────────────────────

/** Copies text; `false` when the platform refused (no permission, insecure context). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Reads the clipboard's text; `null` when the platform refused (no permission, insecure context). */
export async function readText(): Promise<string | null> {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
}

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

/**
 * The system share sheet. `"unsupported"` lets the caller fall back to copying the link, which is
 * what a desktop browser without the Web Share API gets; `"cancelled"` is the person closing it.
 */
export async function share(data: ShareData): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!hasDom() || typeof navigator.share !== "function") return "unsupported";
  try {
    await navigator.share(data);
    return "shared";
  } catch {
    return "cancelled";
  }
}

// ── Files ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Hands a file the app made (an EPUB, an export) to the person: a download here, the system share
 * sheet on Android, where there is no Downloads folder an app can simply drop it into.
 */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  if (!hasDom()) return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ── Connectivity ────────────────────────────────────────────────────────────────────────────────

export function isOnline(): boolean {
  return !hasDom() || navigator.onLine;
}

export function onConnectivityChange(listener: (online: boolean) => void): () => void {
  if (!hasDom()) return () => {};
  const up = () => listener(true);
  const down = () => listener(false);
  window.addEventListener("online", up);
  window.addEventListener("offline", down);
  return () => {
    window.removeEventListener("online", up);
    window.removeEventListener("offline", down);
  };
}

// ── Navigation ──────────────────────────────────────────────────────────────────────────────────

/**
 * Asks the browser to confirm before the page is closed or reloaded while `unsaved()` says
 * something would be lost (JAVA-796). The browser words the prompt itself. Android keeps the app's
 * state across closing, so there it watches nothing.
 */
export function onBeforeLeave(unsaved: () => boolean): () => void {
  if (!hasDom()) return () => {};
  const warn = (event: BeforeUnloadEvent) => {
    if (!unsaved()) return;
    event.preventDefault();
    // Older browsers show the prompt only when this is set.
    event.returnValue = "";
  };
  window.addEventListener("beforeunload", warn);
  return () => window.removeEventListener("beforeunload", warn);
}

/** Leaves the app for another address (a full load on the web; the system browser on Android). */
export function openUrl(url: string): void {
  if (hasDom()) window.location.assign(url);
}

/** Opens an address beside the app, which stays as it is (a new tab on the web; the system browser on Android). */
export function openUrlInNewTab(url: string): void {
  if (hasDom()) window.open(url, "_blank", "noopener");
}

/**
 * Starts the app over, for state that is only read once at start (Tributa binds its document
 * store to the active profile at load). A page reload here; a fresh JS bundle on Android.
 */
export function reloadApp(): void {
  if (hasDom()) window.location.reload();
}

/** Opens the system's print dialog for what the page shows (a card made to be printed). */
export function printPage(): void {
  if (hasDom()) window.print();
}

/** The origin absolute links are built on — `apiOrigin`'s twin for pages instead of the API. */
export function currentOrigin(): string {
  return hasDom() ? window.location.origin : apiOrigin;
}

/** The path the app was loaded at; how a zone tells its `basePath` apart from a bare route. */
export function currentPath(): string {
  return hasDom() ? window.location.pathname : "/";
}

/** The query string the page was loaded with, leading `?` included; how an ad's tags reach a sign-in. */
export function currentSearch(): string {
  return hasDom() ? window.location.search : "";
}

/** Mounted inside the desktop's iframe shell (ADR 0001). Never true on Android: no shell there. */
export function isEmbedded(): boolean {
  return hasDom() && window.self !== window.top;
}

/**
 * Launched as an installed app, with no browser chrome around it: the manifest's
 * `display: standalone` here, or iOS's home-screen web app, which only says so through
 * `navigator.standalone`. Always true on Android, where the app is installed by definition.
 */
export function isStandalone(): boolean {
  if (!hasDom()) return false;
  if (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) {
    return true;
  }
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Whether the keyboard's primary modifier is Command (macOS, iOS, iPadOS) rather than Control.
 * Read when asked, never at import: a module that computes it at load renders the server's guess
 * ("⌘" on a Windows laptop) into the HTML. False on the server.
 */
export function isApplePlatform(): boolean {
  if (!hasDom()) return false;
  const hinted = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
  const s = (hinted ?? navigator.platform ?? navigator.userAgent ?? "").toLowerCase();
  return s.includes("mac") || s.includes("iphone") || s.includes("ipad");
}

// Scroll has no seam here on purpose: on Android it belongs to the ONE height-bounded scroll
// container of the screen (native-portability rule 6), reached through that ScrollView's ref —
// not to a global. Code that scrolls the window becomes code that scrolls its container.

/** Tells assistive technology and the text engine what language the page is in. */
export function setDocumentLanguage(lang: string, dir: "ltr" | "rtl"): void {
  if (!hasDom()) return;
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
}

// ── Images ──────────────────────────────────────────────────────────────────────────────────────

