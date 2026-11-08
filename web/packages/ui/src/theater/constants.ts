import { lazy } from "react";
import type {
  TheaterLabels,
  TheaterLoader,
  TheaterRegistry,
  TheaterViewport,
} from "./types";

export const DEFAULT_LABELS: TheaterLabels = {
  region: "Interactive preview",
  scene: (index, count, title) => `Scene ${index} of ${count}: ${title}`,
  scenes: "Scenes",
  play: "Play",
  pause: "Pause",
  prev: "Previous scene",
  next: "Next scene",
  open: "Open the app",
  paused: "Paused",
  still: "Still",
  hint: "Press anything, it's the real app",
  live: "A live scene, looping",
  loops: "Loops",
  loopsHint: "The last scene runs into the first",
  linkNote: "Links open in the app, not here",
  loading: "Starting the app",
  emptyTitle: "No scenes",
  emptyBody: "There is nothing to preview yet.",
  missingTitle: "This scene isn't available.",
  missingBody: "It was renamed in the app. The others still play.",
  errorTitle: "This scene didn't load.",
  errorBody: "The connection dropped while the app was starting.",
  retry: "Try again",
  windowTitleFallback: "Javadaba",
};

/**
 * Alias kept for existing consumers (`SiteTheater`, Fabula, Officium) that spread it
 * explicitly. `DEFAULT_LABELS` above is English by default now, so this is the same object;
 * it stays exported under its own name so nothing importing it has to change.
 */
export const THEATER_LABELS_EN: TheaterLabels = DEFAULT_LABELS;

/**
 * The desk's default colors: the accent of the Surface the Theater sits in (`--jd-accent-*`), which
 * is the product's own on its pages. On a Surface with no accent they resolve to ink, a stone-grey desk.
 */
export const ACCENT_DESK: readonly string[] = [
  "var(--jd-accent-start)",
  "var(--jd-accent-mid)",
  "var(--jd-accent-end)",
];

export const DEFAULT_VIEWPORT: TheaterViewport = { width: 1280, height: 800 };
export const CURSOR_TRAVEL_MS = 720;
export const EMPTY_SET: ReadonlySet<string> = new Set();

/** Selector for `cursor.target` from a `data-theater-target`. */
export const theaterTarget = (name: string) =>
  `[data-theater-target="${name}"]`;

export const now = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();
export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));
export const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
export const normalizeRoute = (route: string) =>
  route.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/";

/**
 * Converts loaders (`() => import("...")`) into lazy components ready for the
 * registry. It can be mixed with regular components:
 *   { "/a": A, ...lazyRegistry({ "/b": () => import("./b") }) }
 */
export function lazyRegistry(
  loaders: Record<string, TheaterLoader>,
): TheaterRegistry {
  const out: TheaterRegistry = {};
  for (const route of Object.keys(loaders)) {
    const load = loaders[route];
    out[route] = lazy(() =>
      load().then((mod) =>
        typeof mod === "object" && "default" in mod ? mod : { default: mod },
      ),
    );
  }
  return out;
}
