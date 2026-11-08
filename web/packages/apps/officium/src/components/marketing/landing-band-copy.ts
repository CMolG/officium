/**
 * The copy of the closing band (`LandingBand.tsx`), moved from the old one-page product page.
 * "Four things you can check" keeps its four proofs; the second one points at the demos above
 * (plural, since the page now plays seven). The third one is worded so it does not contradict
 * section 4: each card lives in its own project's backlog, and the agent sees every project its
 * connection covers.
 */

/** The four proofs, each one checked against the backend before it was written down. */
export const PROOFS = [
  {
    title: "Agents create and update cards through MCP",
    body:
      "Two tools, discover and query, over your Javadaba account. What the agent writes is the "
      + "same backlog you see on the board, through the same rules -- and each card keeps its "
      + "description apart from its action plan, so you read how it will be done before it is.",
  },
  {
    title: "People see it live on the board",
    body:
      "Every write takes one path in the backend and reaches the board through a live channel. "
      + "The demos above are that mechanism running, not a recording.",
  },
  {
    title: "One backlog per project",
    body:
      "A folder with ten projects holds ten backlogs. Each card lives in the backlog of its own "
      + "project, and nothing moves between them.",
  },
  {
    title: "Agents hand you, as a card, what only you can do",
    body:
      "A secret it cannot set, a call it is not allowed to make. The agent raises a card, blocks "
      + "its own work on it, and the card lands in your Needs you lane. Answer it by editing it or "
      + "commenting, and the agent finds your change the next time it looks.",
  },
] as const;

/** The three nodes of the write path, in the order a write travels. */
export const PATH = [
  {
    title: "Your agent",
    body: "Claude Code, Codex, Cursor or VS Code. It signs in with your account, once.",
  },
  {
    title: "One set of rules",
    body: "Every write, from a person or an agent, goes through the same service, into one backlog per project.",
  },
  {
    title: "Your team, on the board",
    body: "The board updates as it happens. Edits from the web take the same path back.",
  },
] as const;
