/**
 * `@javadaba/sdk`'s shell on Android — the same names as `shell.ts`, with no shell behind them.
 *
 * The iframe app-shell (ADR 0001) is a web construct: on Android there is no Host window, no
 * iframe and no `postMessage`, and React Native's `window` is the global object, so the web half's
 * `win.parent === win` test would not even answer "standalone". A screen already writes
 * `bridge?.ready()` because it also runs standalone on the web; here it always does.
 *
 * Not type-checked by this package's `tsc` yet (JAVA-99 brings `react-native`); the pair's names
 * are pinned by `scripts/test/native-subset.test.mjs`.
 */
import type { AppBridge, AppBridgeHandlers, AppBridgeOptions, AppToHostMessage, HostPort } from "./shell";

export type * from "./shell";

export const SHELL_PROTOCOL_VERSION = 1;

const NO_SHELL = "the iframe app-shell does not exist on Android (ADR 0001 is web-only)";

export function createAppBridge(_appId: string, _handlers: AppBridgeHandlers, _options?: AppBridgeOptions): AppBridge {
  throw new Error(`createAppBridge: ${NO_SHELL}; use createAppBridgeIfEmbedded`);
}

/** Never embedded on Android: every caller takes its standalone path. */
export function createAppBridgeIfEmbedded(
  _appId: string,
  _handlers: AppBridgeHandlers,
  _options?: AppBridgeOptions,
): AppBridge | null {
  return null;
}

export function createHostPort(
  _iframe: unknown,
  _appId: string,
  _onMessage: (message: AppToHostMessage) => void,
  _options?: unknown,
): HostPort {
  throw new Error(`createHostPort: ${NO_SHELL}`);
}
