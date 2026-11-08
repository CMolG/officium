import type { SectionSceneId } from "@/components/theater/section-scenes";

import { SEAT_CLAIM, type SourcedClaim } from "./landing-pricing";

/**
 * The Rule of Seven copy (JAVA-1639), sections 2 to 7. Each section is one hook, one mechanism,
 * one walkthrough and a close that finishes the sentence after its "Open Officium" button, in the
 * order of `doc://history/reports/2026-10-19-officium-rule-of-seven/ux-blueprint`. Section 1 is
 * the hero and keeps its own copy in `OfficiumLanding.tsx`.
 *
 * Section 7 says "every card" and "one .zip", never "everything" or "files": the export holds the
 * cards with their comments, links and plan, and not the documentation pages, the sprints or the
 * attachment bytes (JAVA-1656's correction).
 */
export interface LandingSectionCopy {
  id: string;
  scene: SectionSceneId;
  /** The walkthrough's region label, which begins "Live demo of" so one locator counts them. */
  region: string;
  hook: string;
  mechanism: string;
  /** The sentence after the "Open Officium" button. */
  close: string;
  /** A competitor claim the hook rests on, with its source and the day it was checked. */
  source?: SourcedClaim;
}

/**
 * The hero's proof, shown under the hero frame. The page is Linear's `agent-interaction` doc, and
 * the sentence is quoted from it. Re-read on 2026-10-29; if the page cannot be read on the day the
 * page ships, the proof does not ship.
 */
export const BOARD_PROOF: SourcedClaim = {
  claim: "In Linear an AgentSession is created automatically when an agent is mentioned or delegated an issue.",
  page: "linear.app/developers/agent-interaction",
  url: "https://linear.app/developers/agent-interaction",
  checkedOn: "2026-10-29",
};

export const LANDING_SECTIONS: readonly LandingSectionCopy[] = [
  {
    id: "plan",
    scene: "plan",
    region: "Live demo of plans: an agent writes its plan before a card moves",
    hook: "What exactly is your agent about to do?",
    mechanism:
      "Officium will not start a card for an agent until the card has its plan. You read how it will be done before it is done.",
    close: "and read your first plan.",
  },
  {
    id: "roles",
    scene: "roles",
    region: "Live demo of roles: which AI works each card",
    hook: "Using your best AI for a one-line fix?",
    mechanism:
      "Each card says which AI should work it and how hard it should think, set once for the whole project.",
    close: "and choose who works what.",
  },
  {
    id: "connect",
    scene: "connect",
    region: "Live demo of one connection for every client",
    hook: "One more sign-in for every client you work for?",
    mechanism:
      "Sign in once with your Javadaba account. Your agent sees all your projects through that one connection.",
    close: "and connect your agent.",
  },
  {
    id: "cost",
    scene: "cost",
    region: "Live demo of what each finished card costs",
    hook: "Do you know what one finished card costs you?",
    mechanism:
      "Officium counts the hours and tokens of every agent run. It shows what each clean delivery cost and how many cards passed review the first time.",
    close: "and see your own numbers.",
  },
  {
    id: "room",
    scene: "room",
    region: "Live demo of room, not seats",
    hook: "Paying for a seat for everyone who opens the board?",
    mechanism:
      "Officium starts free with 15 MB of cards and documents. When you need more, you add room, not people.",
    close: "and add your first project.",
    source: SEAT_CLAIM,
  },
  {
    id: "export",
    scene: "export",
    region: "Live demo of leaving with every card",
    hook: "Could you leave your tracker tomorrow with every card in it?",
    mechanism:
      "Download the whole backlog as one .zip: a Markdown file for each card, with its comments, links and plan.",
    close: "and try the export on day one.",
  },
];
