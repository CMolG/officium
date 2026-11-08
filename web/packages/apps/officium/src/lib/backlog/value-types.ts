// The value report on the wire (card://JAVA-1047): `GET /projects/{id}/value` and the account's subscription
// price. Mirrors the API's ValueService.View and ValueFigures.Figures; money is in USD.

/** One month's figures. The ratios are null unless the reader's own price is the fee: they have set one, and no
 *  account but theirs reported usage in the month. */
export interface ValueFigures {
  delivered: number;
  /** Delivered cards whose hours were imputed from their category's mean, not measured. */
  imputed: number;
  agentHours: number;
  /** The agent hours the harness said whether a person was attended for. */
  classifiedHours: number;
  /** The classified hours no attended window overlapped: the night a loop ran with nobody there. */
  unattendedHours: number;
  tokens: number;
  /** The usage priced at API rates. A model with no price is counted in `unpricedRows`, never valued. */
  apiValue: number;
  unpricedRows: number;
  unpricedModels: string[];
  /** The fee divided by the cards delivered in the month. */
  costPerDeliveredCard: number | null;
  /** The API-equivalent value divided by the fee. */
  valuePerDollar: number | null;
}

/** One line of a split: its key, and the hours and API-equivalent value of its rows. */
export interface ValueLine {
  key: string;
  hours: number;
  apiValue: number;
}

/** The month's agent work split by category, by phase and by model (card://JAVA-1047). */
export interface ValueBreakdown {
  byCategory: ValueLine[];
  byPhase: ValueLine[];
  byModel: ValueLine[];
}

export interface ValueView {
  /** yyyy-mm, UTC. */
  month: string;
  current: ValueFigures;
  previous: ValueFigures;
  breakdown: ValueBreakdown;
}

/** The caller's own monthly subscription price; null until they set one. Nobody else reads it. */
export interface Subscription {
  monthlyUsd: number | null;
}
