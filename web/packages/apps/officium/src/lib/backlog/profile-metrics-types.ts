// `metrics.get` `profiles` on the wire (card://JAVA-1527): Contributions by AI work profile. Mirrors the API's
// `ProfileTally.View`; a card moved before phase runs were kept is in none of it.
import type { TokenCounts } from "./metrics-types";

/** The key of cards run under no profile: Officium's own defaults. */
export const DEFAULTS_PROFILE = "officium-defaults";

export interface ProfileCost {
  hours: number;
  tokens: TokenCounts;
  /** Time on the corrective cards whose `Caused by:` names this profile's cards. */
  debtHours: number;
  debtTokens: TokenCounts;
  /** Approved the first time and named by no escaped defect. */
  cleanDeliveries: number;
  /** The clean deliveries whose card recorded tokens: the denominator of `tokensPerCleanDelivery` (JAVA-1588). Absent
   *  from an API older than it. */
  cleanWithTokens?: number;
  hoursPerCleanDelivery: number | null;
  tokensPerCleanDelivery: TokenCounts | null;
}

export interface ProfileRow {
  profileId: string;
  reviewed: number;
  firstTime: number;
  passedFirstTime: number;
  firstTimePassRate: number | null;
  sendBackReasons: Record<string, number>;
  violationsByDimension: Record<string, number>;
  escapedByPhase: Record<string, number>;
  /** Reviews with no architecture or clean-code violation, of all reviews. */
  codeHealthRate: number | null;
  cost: ProfileCost;
}

export interface ReviewerCatch {
  model: string;
  caught: number;
  escaped: number;
  rate: number | null;
}

export interface ProfileCell {
  profileId: string;
  category: string | null;
  phase: string;
  model: string | null;
  reviewed: number;
  violating: number;
  violationRate: number | null;
  /** Reviews that sent the card back for a reason other than integration-failed (card://JAVA-1804). */
  sentBack?: number;
  sendBackRate?: number | null;
}

/** `firedBy` names the measures that reached the bar; absent on an API that predates JAVA-1804. */
export interface ProfileRecommendation {
  profileId: string;
  category: string | null;
  phase: string;
  model: string;
  raiseTo: string;
  violationRate: number;
  reviewed: number;
  violating?: number;
  sentBack?: number;
  sendBackRate?: number;
  firedBy?: ("violations" | "send-backs")[];
}

export interface ProfileEscape {
  originKey: string | null;
  correctiveKey: string;
  escapedIn: string;
  profileId: string;
  at: string;
}

export interface ProfileMetrics {
  thresholds: { violationRate: number; sendBackRate?: number; minReviewed: number };
  byProfile: ProfileRow[];
  reviewerCatch: ReviewerCatch[];
  cells: ProfileCell[];
  recommendations: ProfileRecommendation[];
  escapedDefects: ProfileEscape[];
}

/** Who ran the phase a card left, kept on every status change (the API's `PhaseRun`). */
export interface PhaseRun {
  cardId: string;
  at: string;
  /** Only an agent's run is laid on a profile. */
  actorKind: "person" | "agent";
  from: string;
  to: string;
  category: string | null;
  profileId: string | null;
  role: string | null;
  model: string | null;
  effort: string | null;
}
