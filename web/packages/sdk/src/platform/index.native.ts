/**
 * `@javadaba/sdk/platform` on Android — the same names as `index.ts`, backed by React Native.
 *
 * Not type-checked by this package's `tsc` (its tsconfig excludes `*.native.ts`): the Android app's
 * (`packages/apps/android-skeleton`, JAVA-99) is, with `pnpm --filter @javadaba/android-skeleton lint`.
 * The same arrangement as `@javadaba/ui`'s `text.native.tsx`.
 */
import NetInfo from "@react-native-community/netinfo";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Sharing from "expo-sharing";
import * as Updates from "expo-updates";
import { AccessibilityInfo, AppState, BackHandler, Dimensions, Linking, Share } from "react-native";
import { bearerFetch, type ApiAuth } from "./bearer-fetch";

export const hasDom = (): boolean => false;

// ── The API origin ──────────────────────────────────────────────────────────────────────────────

let apiOrigin = "";

/** Android has no origin: the entry point sets the absolute one before the first call. */
export function configureApiOrigin(origin: string): void {
  apiOrigin = origin.replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  if (!apiOrigin) throw new Error(`apiUrl(${path}): configureApiOrigin() was never called on this device`);
  return apiOrigin + path;
}

export type { ApiAuth } from "./bearer-fetch";

let apiAuth: ApiAuth | null = null;

/** The sign-in's session, set once at start by `configureAppSignIn` (`@javadaba/account`). */
export function configureApiAuth(auth: ApiAuth | null): void {
  apiAuth = auth;
}

/** The bearer, never a cookie: see `bearerFetch`. */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return bearerFetch(fetch, apiUrl(path), init, apiAuth);
}

// ── App events ──────────────────────────────────────────────────────────────────────────────────

const listeners = new Map<string, Set<(detail: unknown) => void>>();

export function emitAppEvent(name: string, detail?: unknown): void {
  for (const listener of listeners.get(name) ?? []) listener(detail);
}

export function onAppEvent(name: string, listener: (detail: unknown) => void): () => void {
  const set = listeners.get(name) ?? new Set();
  set.add(listener);
  listeners.set(name, set);
  return () => set.delete(listener);
}

// ── Foreground and visibility ───────────────────────────────────────────────────────────────────

export function isHidden(): boolean {
  return AppState.currentState !== "active";
}

export function onVisibilityChange(listener: (hidden: boolean) => void): () => void {
  const subscription = AppState.addEventListener("change", (state) => listener(state !== "active"));
  return () => subscription.remove();
}

export function onForeground(listener: () => void): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") listener();
  });
  return () => subscription.remove();
}

// ── Presence: AppState "active" is both visible and focused ─────────────────────────────────────

export function isFocused(): boolean {
  return AppState.currentState === "active";
}

export function onFocusChange(listener: (focused: boolean) => void): () => void {
  const subscription = AppState.addEventListener("change", (state) => listener(state === "active"));
  return () => subscription.remove();
}

export type PresenceState = { visible: boolean; focused: boolean };

export function presenceState(): PresenceState {
  const active = AppState.currentState === "active";
  return { visible: active, focused: active };
}

export function onPresenceChange(listener: (state: PresenceState) => void): () => void {
  let last = presenceState();
  const subscription = AppState.addEventListener("change", () => {
    const next = presenceState();
    if (next.visible === last.visible && next.focused === last.focused) return;
    last = next;
    listener(next);
  });
  return () => subscription.remove();
}

// ── Keeping the screen on ───────────────────────────────────────────────────────────────────────

export type KeepAwakeEvent =
  | { type: "held" }
  | { type: "released"; by: "app" | "system" }
  | { type: "rejected"; reason: string }
  | { type: "unsupported" };

let keepAwakeTags = 0;

/** Android keeps the flag across background and foreground itself: nothing to take again. */
export function keepAwake(onEvent: (event: KeepAwakeEvent) => void = () => {}): () => void {
  const tag = `jdb-keep-awake-${++keepAwakeTags}`;
  let wanted = true;
  activateKeepAwakeAsync(tag).then(
    () => (wanted ? onEvent({ type: "held" }) : void deactivateKeepAwake(tag)),
    (error: unknown) => onEvent({ type: "rejected", reason: String(error) }),
  );
  return () => {
    wanted = false;
    void deactivateKeepAwake(tag).then(() => onEvent({ type: "released", by: "app" }));
  };
}

// ── Media queries ───────────────────────────────────────────────────────────────────────────────

// The accessibility setting is read asynchronously on Android; the answer is cached so the
// synchronous signature stays the web's, and it starts at "motion allowed" until it arrives.
let reducedMotion = false;
void AccessibilityInfo.isReduceMotionEnabled().then((value) => (reducedMotion = value));
AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => (reducedMotion = value));

export function prefersReducedMotion(): boolean {
  return reducedMotion;
}

export function onReducedMotionChange(listener: (reduced: boolean) => void): () => void {
  const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", listener);
  return () => subscription.remove();
}

// ── The viewport ────────────────────────────────────────────────────────────────────────────────

export function viewportSize(): { w: number; h: number } | null {
  const { width, height } = Dimensions.get("window");
  return { w: width, h: height };
}

export function onViewportResize(listener: () => void): () => void {
  const subscription = Dimensions.addEventListener("change", listener);
  return () => subscription.remove();
}

// ── Keyboard and focus ──────────────────────────────────────────────────────────────────────────

/** Keyboard shortcuts are a desktop affordance; a phone has none to listen to. */
export function onKeyDown(_listener: (event: KeyboardEvent) => void): () => void {
  return () => {};
}

export function onDismissKey(listener: () => void): () => void {
  const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
    listener();
    return true;
  });
  return () => subscription.remove();
}

/** TalkBack moves and returns focus itself around a native modal. */
export function focusedElement(): HTMLElement | null {
  return null;
}

/** Android has no page body to portal to: its floating layers are native. */
export function portalRoot(): HTMLElement | null {
  return null;
}

// ── Storage ─────────────────────────────────────────────────────────────────────────────────────

/** An app's own storage on Android is never evicted under pressure: nothing to ask for. */
export async function requestPersistentStorage(): Promise<boolean> {
  return true;
}

// ── Clipboard and share ─────────────────────────────────────────────────────────────────────────

export async function copyText(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}

export async function readText(): Promise<string | null> {
  try {
    return await Clipboard.getStringAsync();
  } catch {
    return null;
  }
}

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
}

export async function share(data: ShareData): Promise<"shared" | "cancelled" | "unsupported"> {
  try {
    const result = await Share.share({ title: data.title, message: data.text ?? data.url ?? "", url: data.url });
    return result.action === Share.sharedAction ? "shared" : "cancelled";
  } catch {
    return "cancelled";
  }
}

// ── Files ───────────────────────────────────────────────────────────────────────────────────────

/** Written to the app's cache, then offered through the share sheet (Drive, Files, email...). */
export async function saveFile(blob: Blob, filename: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(new Uint8Array(await blob.arrayBuffer()));
  await Sharing.shareAsync(file.uri, blob.type ? { mimeType: blob.type } : undefined);
}

// ── Connectivity ────────────────────────────────────────────────────────────────────────────────

let online = true;
NetInfo.addEventListener((state) => (online = state.isConnected !== false));

export function isOnline(): boolean {
  return online;
}

export function onConnectivityChange(listener: (online: boolean) => void): () => void {
  return NetInfo.addEventListener((state) => listener(state.isConnected !== false));
}

// ── Navigation ──────────────────────────────────────────────────────────────────────────────────

/** No page to close: an app's state outlives the system closing it, so nothing is lost to warn about. */
export function onBeforeLeave(_unsaved: () => boolean): () => void {
  return () => {};
}

export function openUrl(url: string): void {
  void Linking.openURL(url);
}

export function openUrlInNewTab(url: string): void {
  void Linking.openURL(url);
}

/** expo-updates restarts the JS bundle; state read once at start is read again. */
export function reloadApp(): void {
  void Updates.reloadAsync();
}

/** Android prints through the share sheet's own Print, so there is nothing to open here. */
export function printPage(): void {}

export function currentOrigin(): string {
  return apiOrigin;
}

/** Screens are routed by the native navigator, never by a URL path: every app starts at its root. */
export function currentPath(): string {
  return "/";
}

/** Nothing arrives from an ad link on Android, so there is no query. */
export function currentSearch(): string {
  return "";
}

export function isEmbedded(): boolean {
  return false;
}

/** An app on Android is installed: there is no browser chrome to be inside of. */
export function isStandalone(): boolean {
  return true;
}

/** Android has no Command key: its primary modifier is Control. */
export function isApplePlatform(): boolean {
  return false;
}

/** The screen reader reads the system language, and layout direction is set at start-up. */
export function setDocumentLanguage(_lang: string, _dir: "ltr" | "rtl"): void {}

// ── Images ──────────────────────────────────────────────────────────────────────────────────────

