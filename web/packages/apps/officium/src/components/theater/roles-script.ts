import { theaterTarget, type TheaterCursor } from "@javadaba/ui";

import { configurationPath } from "../../lib/configuration/places";

// The Theater script of the work-profile scene, as data. Plain: no React, no repository, no JSON
// at load, so the landing reads its length and its cursor without pulling the app in. The steps
// that write to the repository live in `use-roles-script.ts`.

/** The six cards the scene shows, in phase order: refine, to do, in progress, ready, review, deploy. */
export const ROLES_CARDS = ["OFF-104", "OFF-102", "OFF-112", "OFF-105", "OFF-106", "OFF-103"] as const;

/** The profile the scene switches to: the cheap one, planning on Opus at high and Sonnet in every other phase, cheaper by effort. */
export const PROFILE_ECO = "claude-eco";

/** Officium's own matrix, the one the project ships with (no profile). */
export const PROFILE_DEFAULTS = "__defaults__";

/** The seeded Storefront project, as `DEFAULT_PROJECT_ID` names it. A unit pins the two together. */
const STOREFRONT_PROJECT = "proj-storefront";

/** The page where a project's work profile is set, under Officium's own path. */
export const ROLES_ROUTE = `/officium${configurationPath("work-profile", STOREFRONT_PROJECT)}`;

/**
 * The sentence the scene proves its claim with. The page and the date are the criterion's: a
 * reader can open the source and see the claim was checked the day it was written.
 */
export const LINEAR_PROOF = {
  page: "linear.app/developers/agents",
  checkedOn: "2026-10-19",
  sentence:
    "Linear lets you delegate an issue to an agent (linear.app/developers/agents, 2026-10-19); the pages we read do not set the AI or the effort for each issue.",
} as const;

/** Scene times (ms): when the profile is applied on its own, and when the agent picks a card up. */
export const ROLES_STEP_MS = {
  ensure: 4400,
  pickUp: 6600,
} as const;

/** The scene's length: the last step plus a beat to read the end state. */
export const ROLES_SCRIPT_MS = ROLES_STEP_MS.pickUp + 4000;

/** The person's half, played by the ghost cursor. `act: true` is a real click on the real control. */
export const ROLES_CURSOR: readonly TheaterCursor[] = [
  { at: 1400, target: theaterTarget("work-profile-select"), click: true, act: true },
  { at: 2400, target: '[role="listbox"] [data-value="claude-eco"]', click: true, act: true },
  { at: 3400, target: theaterTarget("work-profile-apply"), click: true, act: true },
];
