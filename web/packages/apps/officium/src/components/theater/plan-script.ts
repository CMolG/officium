import type { TheaterCursor } from "@javadaba/ui";

import type { CardWorkflow } from "../../lib/backlog/types";

/**
 * The plan scene's script, as plain data. It is the landing's half of the choreography: the
 * landing reads `PLAN_SCRIPT_MS` and `PLAN_CURSOR` at load, so this module must not import React
 * components, the repository or `@javadaba/ui` at runtime (`plan-scene.tsx` owns those). The
 * cursor targets are `theaterTarget(name)` written out, so the spec can load this file on its own.
 *
 * The story: a person tries to move an agent's card from Refine to To do before the agent has
 * written its plan. Officium refuses, and says why. The agent writes the plan. The person tries
 * again, and the card moves.
 */

/** Where the one line of proof comes from. Checked on the day the copy was written. */
export const PLAN_PROOF = {
  page: "linear.app/developers/agent-interaction",
  checkedOn: "2026-10-19",
} as const;

export const PLAN_CARD_TITLE = "Add the pricing page hero section";

export const PLAN_CARD_DESCRIPTION =
  "Replace the placeholder hero with the headline, one line of support copy and the primary action.\n\n"
  + "Show the three plans side by side, with the recommended one highlighted.\n\n"
  + "Done when the hero reads on a phone without horizontal scroll.";

/** The workflow the agent writes first (JAVA-1592): its refine role is the one the plan names. */
export const PLAN_WORKFLOW: CardWorkflow = { version: 1, phases: { refine: { role: "ux-ui-designer", mods: [] } } };

/**
 * The agent's written plan. It opens with its `Base:` line and carries the workflow's refine role, the form the server
 * and the board both accept (`planRefusal` in `lib/backlog/plan-gate.ts`), so the card may leave Refine once it lands.
 */
export const PLAN_TEXT = [
  "Base: control branch",
  "Role: ux-ui-designer",
  "",
  "1. Lay out the hero: headline, one line of support copy, one primary action.",
  "2. Show the three plans side by side, with the recommended one highlighted.",
  "3. Keep the loading, empty and error states on the card's own captions.",
  "4. Check the phone width: no horizontal scroll, the action is on the first screen.",
].join("\n");

/** The ghost cursor's tour: two tries, the first refused, the second through. */
export const PLAN_CURSOR: readonly TheaterCursor[] = [
  { at: 1400, target: '[data-theater-target="card-status"]', click: true, act: true },
  { at: 2300, target: '[role="listbox"] [data-value="todo"]', click: true, act: true },
  { at: 8200, target: '[data-theater-target="card-status"]', click: true, act: true },
  { at: 9100, target: '[role="listbox"] [data-value="todo"]', click: true, act: true },
];

/** The scene's length in the Theater: the last step plus a beat to read the end state. */
export const PLAN_SCRIPT_MS = 13_000;
