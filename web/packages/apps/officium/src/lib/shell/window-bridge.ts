import type { AppBridge, PipWidget } from "@javadaba/sdk";

/**
 * The desktop window's bridge, shared with the parts of the shell that report to the Host. The shell
 * creates it once for the whole `/app` subtree (`AppShellClient`); the window's navigation reads it
 * to keep the window's title in step with where the person is ("Officium · Javadaba web · Task
 * Board", Off-Shell). Outside a window there is none and every call does nothing.
 */
let bridge: AppBridge | null = null;

export function registerWindowBridge(next: AppBridge | null): void {
  bridge = next;
}

export function setWindowTitle(title: string): void {
  bridge?.setTitle(title);
}

/** The piece the Host keeps above the windows for Picture in picture; `null` takes it away. */
export function setWindowPip(widget: PipWidget | null): void {
  bridge?.setPip(widget);
}
