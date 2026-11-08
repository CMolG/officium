import type { TheaterCursor } from "@javadaba/ui";

// The Theater script of the real-cost scene, as data. Plain: no React, no repository, so the landing
// reads its length, its cursor and its proof without pulling the app in. The state that plays it
// lives in `use-contributions-script.ts`. Cursor targets are `theaterTarget(name)` written out, so the
// landing's spec can load this file on its own (a value import of the ui barrel pulls the brand in).

/** The Theater registry key only: nothing publishes it (the live page is `/app/p/<project>/contributions`). */
export const CONTRIBUTIONS_ROUTE = "/officium/app/contributions";

/** The profile the scene switches to: the cheap one, planning on Opus at high and Sonnet in every other phase, cheaper by effort. */
export const PROFILE_ECO = "claude-eco";

/** Officium's own matrix, the one the project ships with. Its id is the product's `DEFAULTS_PROFILE`. */
export const PROFILE_DEFAULTS = "officium-defaults";

/** Scene time (ms) when Eco is applied on its own, for a viewer who has not chosen yet. */
export const CONTRIBUTIONS_STEP_MS = {
  ensure: 3600,
} as const;

/** The scene's length: the last step plus a beat to read the end state. */
export const CONTRIBUTIONS_SCRIPT_MS = CONTRIBUTIONS_STEP_MS.ensure + 4200;

/** The person's half, played by the ghost cursor: open the real Select, then click Eco in it. */
export const CONTRIBUTIONS_CURSOR: readonly TheaterCursor[] = [
  { at: 1500, target: '[data-theater-target="cost-profile-select"]', click: true, act: true },
  { at: 2500, target: '[role="listbox"] [data-value="claude-eco"]', click: true, act: true },
];

/**
 * The sentence the scene proves its claim with. The page and the date are the criterion's: a reader
 * can open the source and see the claim was checked the day it was written. Re-opened 2026-10-20:
 * the page says the balance is prepaid and workspace-level, and that a coding session's cost shows
 * token, compute and total cost on hover. It also bills agent loops per run, so this sentence must
 * never be widened into a claim that Linear lacks a per-card cost.
 */
export const COST_PROOF = {
  page: "linear.app/docs/ai-credits",
  checkedOn: "2026-10-20",
  sentence:
    "Linear shows AI spend as one prepaid balance for the workspace and a cost for each coding session (linear.app/docs/ai-credits, 2026-10-20).",
} as const;
