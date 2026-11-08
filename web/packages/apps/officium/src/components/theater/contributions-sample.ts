import type { TokenCounts } from "../../lib/backlog/metrics-types";
import { PROFILE_DEFAULTS, PROFILE_ECO } from "./contributions-script";

// Sample data for a made-up team, not measured. Every figure the scene shows comes from these rows
// through the product's own formulas (`profile-metrics-format.ts`), and the scene labels them so.

/** One work profile's totals, in the shape the product sums per clean delivery. */
export interface SampleProfile {
  profileId: string;
  firstTime: number;
  passedFirstTime: number;
  cleanDeliveries: number;
  hours: number;
  debtHours: number;
  tokens: TokenCounts;
  debtTokens: TokenCounts;
}

const tokens = (tokensIn: number, tokensOut: number): TokenCounts => ({
  tokensIn,
  tokensOut,
  cachedTokensIn: 0,
  reasoningTokens: 0,
});

/**
 * Eco is cheaper per clean delivery in hours and in tokens, and passes review the first time less
 * often: the trade-off a reader weighs. The unit test pins that ordering, not these strings.
 */
export const SAMPLE_PROFILES: readonly SampleProfile[] = [
  {
    profileId: PROFILE_DEFAULTS,
    firstTime: 14,
    passedFirstTime: 11,
    cleanDeliveries: 10,
    hours: 19.5,
    debtHours: 1.5,
    tokens: tokens(610_000, 190_000),
    debtTokens: tokens(50_000, 10_000),
  },
  {
    profileId: PROFILE_ECO,
    firstTime: 14,
    passedFirstTime: 9,
    cleanDeliveries: 6,
    hours: 5.4,
    debtHours: 2.4,
    tokens: tokens(150_000, 60_000),
    debtTokens: tokens(30_000, 9_000),
  },
];

export const SAMPLE_LABEL = "Sample data";

export const SAMPLE_FOOT = "Sample numbers for a made-up team, not measured.";

export const EMPTY_SENTENCE =
  "No card was reviewed under a work profile in this period. Cards count here once an agent moves them out of a phase.";

export const SCENE_SENTENCE =
  "What one clean delivery cost, by work profile. A clean delivery passed review the first time and no later defect was traced to it.";
