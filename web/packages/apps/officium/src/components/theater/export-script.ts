import type { TheaterCursor } from "@javadaba/ui";

// The Theater script of the leave-anytime scene, as data. Plain: no React, no repository, so the
// landing reads its length, its cursor and its proof without pulling the app in. The state that
// plays it lives in `use-export-script.ts`.

/** The Theater registry key only: nothing publishes it. The control it plays is the project menu's entry. */
export const EXPORT_ROUTE = "/officium/app/export";

/** Scene time (ms) of each step. The cursor's own steps are in `EXPORT_CURSOR`. */
export const EXPORT_STEP_MS = {
  /** The three cards turn into files, staggered by `EXPORT_FILE_GAP_MS`. */
  files: 3500,
  /** The notice names the zip. */
  zip: 5000,
  /** The first file opens and shows its Markdown. */
  open: 5600,
  /** The file's pane scrolls to its title and plan, so both are read. */
  title: 6200,
  /** Then to the end, where the comment is. */
  end: 7000,
} as const;

/** Between two files leaving the list, so the eye follows each one. */
export const EXPORT_FILE_GAP_MS = 250;

/** The scene's length: the last step plus a beat to read the file. */
export const EXPORT_SCRIPT_MS = EXPORT_STEP_MS.end + 3000;

/**
 * The person's half, played by the ghost cursor: press the real More button on the project row, then
 * the real "Export backlog" entry in the menu it opens. Targets are the real controls' own hooks.
 */
export const EXPORT_CURSOR: readonly TheaterCursor[] = [
  { at: 1800, target: '[aria-label="More actions for Storefront"]', click: true, act: true },
  { at: 2800, target: '[data-testid="project-menu-export"]', click: true, act: true },
];

/**
 * The sentence the scene proves its claim with. The page and the date are the criterion's: a reader
 * can open the source and see the claim was checked the day it was written. Re-checked when the card
 * goes to review: if the page cannot be read, the proof does not ship.
 */
export const EXPORT_PROOF = {
  page: "linear.app/docs/exporting-data",
  checkedOn: "2026-10-20",
  sentence:
    "In Linear the workspace export is for admins: a CSV, sent as an emailed link that expires after 12 hours (linear.app/docs/exporting-data, 2026-10-20).",
} as const;
