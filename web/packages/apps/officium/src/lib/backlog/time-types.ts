// Time-entry wire shapes, split from types.ts (JAVA-1376) to keep it under its architecture ceiling.

import type { Status } from "./types";

export interface TimeEntry {
  id: string;
  cardId: string;
  cardKey: string;
  /** `yyyy-mm-dd`. */
  date: string;
  hours: number;
  who: string;
  accountId: string | null;
  note: string;
  createdAt: string;
  /** `manual`: logged by a person. `agentRun`: imputed from an agent's run (officium-api.md
   *  §8.4, JAVA-50). `agentSession`: imputed from the whole session its harness reported, with
   *  model and tokens (JAVA-245). Only people's entries are written by this app. */
  source: "manual" | "agentRun" | "agentSession";
  /** What the time went to: refining the card, working it, or running its tests (a harness report). */
  concept: "work" | "refine" | "test";
  /** The span imputed time covers, and -- from a session -- the model, the effort it ran at
   *  (JAVA-584), its tokens and the subagent that spent them. Null where nothing measured them. */
  model: string | null;
  effort: string | null;
  tokensIn: number | null;
  cachedTokensIn: number | null;
  /** The thinking part of `tokensOut`, not an addend. */
  reasoningTokens: number | null;
  tokensOut: number | null;
  startedAt: string | null;
  endedAt: string | null;
  subagent: string | null;
  /** The work profile a session ran under (card://JAVA-1527); null on every other entry, absent from an older API. */
  profileId?: string | null;
  /** The card's title, epic and status: set on the timesheet's entries only (JAVA-1661), null when the card
   *  is deleted. Absent from an older API. */
  cardTitle?: string | null;
  cardEpic?: string | null;
  cardStatus?: Status | null;
}

export interface Timesheet {
  from: string;
  to: string;
  entries: TimeEntry[];
  totals: { who: string; hours: number }[];
}
