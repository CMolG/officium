/*
 * The viewport matrix: three widths, and each one is there because something breaks at it.
 *
 * 320 is the narrowest width still in real use (iPhone SE and every "reader mode" clone); it is
 * where a fixed-width table or a two-column grid stops fitting. The default is Playwright's own,
 * so a test that does not care about width behaves exactly as it always has. 1440 is where a
 * layout with no max-width starts stretching lines past readability.
 *
 * No device emulation here on purpose — `devices[...]` also sets user agent, touch and DPR, which
 * is a different test (and belongs in a project's `projects: []`). This matrix varies ONE thing.
 */
export interface Viewport {
  width: number;
  height: number;
}

export const VIEWPORTS = {
  /** The narrow floor. Nothing may overflow horizontally here. */
  narrow: { width: 320, height: 720 },
  /** Playwright's default viewport. */
  default: { width: 1280, height: 720 },
  /** Wide desktop. */
  wide: { width: 1440, height: 900 },
} as const satisfies Record<string, Viewport>;

export type ViewportName = keyof typeof VIEWPORTS;

/** Iterable form, for `for (const [name, viewport] of VIEWPORT_MATRIX)`. */
export const VIEWPORT_MATRIX = Object.entries(VIEWPORTS) as [ViewportName, Viewport][];
