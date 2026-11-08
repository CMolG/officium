import type { TokenCounts } from "../../lib/backlog/metrics-types";
import { kiloTokens, percent, profileName } from "../../lib/backlog/profile-metrics-format";
import { EMPTY_SENTENCE, SAMPLE_PROFILES, type SampleProfile } from "./contributions-sample";
import { PROFILE_DEFAULTS } from "./contributions-script";

/** One figure of the scene: its label, its value, and the baseline note when the choice is not the defaults. */
export interface Figure {
  label: string;
  value: string;
  note?: string;
}

/** What the scene's read of the sample has returned. */
export type CostRead =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: readonly SampleProfile[] };

/** The four states the scene draws. Every one is named here, so none is left to the component. */
export type CostView =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty"; sentence: string; name: string; figures: Figure[] }
  | { kind: "ready"; name: string; figures: Figure[] };

const perClean = (total: number, clean: number) => total / clean;

const sumTokens = (a: TokenCounts, b: TokenCounts): TokenCounts => ({
  tokensIn: a.tokensIn + b.tokensIn,
  tokensOut: a.tokensOut + b.tokensOut,
  cachedTokensIn: 0,
  reasoningTokens: 0,
});

/** The three figures of one profile, per clean delivery, read with the product's formulas. */
export function figuresOf(row: SampleProfile): Figure[] {
  const hours = perClean(row.hours + row.debtHours, row.cleanDeliveries);
  const tokens = sumTokens(row.tokens, row.debtTokens);
  return [
    { label: "Hours per clean delivery", value: `${hours.toFixed(1)} h` },
    {
      label: "Tokens per clean delivery",
      value: kiloTokens({
        tokensIn: perClean(tokens.tokensIn, row.cleanDeliveries),
        tokensOut: perClean(tokens.tokensOut, row.cleanDeliveries),
        cachedTokensIn: 0,
        reasoningTokens: 0,
      }),
    },
    {
      label: "Passed review first time",
      value: percent(row.passedFirstTime / row.firstTime),
    },
  ];
}

/** The same figures, each with the defaults' value beside it, for a choice that is not the defaults. */
function withBaseline(figures: Figure[], baseline: Figure[]): Figure[] {
  return figures.map((figure, i) => ({
    ...figure,
    note: `Officium's defaults: ${baseline[i].value}`,
  }));
}

function figuresFor(rows: readonly SampleProfile[], choice: string): { name: string; figures: Figure[] } {
  const chosen = rows.find((row) => row.profileId === choice) ?? rows[0];
  const figures = figuresOf(chosen);
  if (chosen.profileId === PROFILE_DEFAULTS) return { name: profileName(chosen.profileId), figures };
  const baseline = rows.find((row) => row.profileId === PROFILE_DEFAULTS);
  return {
    name: profileName(chosen.profileId),
    figures: baseline ? withBaseline(figures, figuresOf(baseline)) : figures,
  };
}

/** The scene's view of the read and the viewer's choice: a pure function, so every state is testable. */
export function costView(read: CostRead, choice: string): CostView {
  if (read.status === "loading") return { kind: "loading" };
  if (read.status === "error") return { kind: "error", message: read.message };
  if (read.rows.length === 0) {
    return { kind: "empty", sentence: EMPTY_SENTENCE, ...figuresFor(SAMPLE_PROFILES, PROFILE_DEFAULTS) };
  }
  return { kind: "ready", ...figuresFor(read.rows, choice) };
}
