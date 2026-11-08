/**
 * The words of `/officium/agents` (JAVA-2040). Every section opens on its own subject, so a passage read alone
 * (by a person who landed on the anchor, or by a search engine quoting it) still says what it is about.
 * Counts and dates are not written here: they come from `agents-data.json`.
 */
export const AGENTS_TITLE = "Officium backlog over MCP for AI agents: operations, setup and a live example";

export const AGENTS_DESCRIPTION =
  "Officium gives an AI agent a backlog it can read and write over MCP. The full operation catalog, the "
  + "command that connects an agent, and the figures from the board Javadaba runs on it, dated.";

export const AGENTS_LEDE =
  "Officium is a backlog that people use from the web and AI agents use through the Model Context Protocol. "
  + "An agent finds the next card, writes its plan, comments, moves the card and hands a person what only a "
  + "person can do, all on the same board you see.";

/** What an agent does with the backlog. `ops` are real operation keys; a test fails when one stops existing. */
export const AGENT_ACTIONS: readonly { title: string; body: string; ops: readonly string[] }[] = [
  {
    title: "Find the work",
    body: "The agent asks which card to work on next, which cards are already in progress, or searches the cards by text and filters.",
    ops: ["cards.next", "cards.working", "cards.search"],
  },
  {
    title: "Read a card in full",
    body: "A card comes with its description, action plan, comments, time entries and links, so the agent starts from what the team wrote.",
    ops: ["cards.get", "docs.get"],
  },
  {
    title: "Write back",
    body: "The agent creates cards, edits a card's plan, comments, and moves a card between the six states, with a position in the column.",
    ops: ["cards.create", "cards.update", "cards.comment", "cards.move"],
  },
  {
    title: "Hand a person what only a person can do",
    body: "When the agent reaches a wall it cannot pass, it opens a card for a person instead of leaving a comment in a log nobody reads.",
    ops: ["cards.requestHuman"],
  },
  {
    title: "Measure the work",
    body: "A project's contributions for a period: cards delivered, hours, who delivered what, and how many reviews sent a card back.",
    ops: ["metrics.get", "projects.list"],
  },
];

export const AGENT_LIMITS: readonly string[] = [
  "The figures come from one board, Javadaba's, run by one person with agents. They show that the loop works at this size; they do not predict what a team of ten will see.",
  "A card counts as delivered the first time it reaches review or a later state. Deliveries are recorded under the account that did the work, and on this board that is always an agent account: the people on the project write the goals, answer the cards agents hand them and decide what ships.",
  "The review figure counts cards that finished review in the period. Cards still waiting for a reviewer are not in it.",
  "The snapshot is refreshed by a script from a signed-in session, because the figures need the board owner's account. The date above the figures is the day it was taken.",
];
