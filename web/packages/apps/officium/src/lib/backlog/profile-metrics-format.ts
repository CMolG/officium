import { BUILTIN_NAMES } from "../profiles/builtins";
import { CATEGORY_CONFIG } from "./category-config";
import { DEFAULTS_PROFILE } from "./profile-metrics-types";
import type { TokenCounts } from "./metrics-types";
import type { ProfileRecommendation } from "./profile-metrics-types";
import type { Category } from "./types";

/** How Contributions' "By AI profile" reads its numbers (card://JAVA-1527). */
/** `names`: the caller's own profiles by id; a profile that is not theirs shows its id. */
export const profileName = (id: string, names: Record<string, string> = {}) =>
  id === DEFAULTS_PROFILE ? "Officium's defaults" : names[id] ?? BUILTIN_NAMES[id] ?? id;
export const percent = (share: number | null) => (share === null ? "—" : `${Math.round(share * 100)}%`);
export const categoryName = (category: string | null) =>
  category && category in CATEGORY_CONFIG ? CATEGORY_CONFIG[category as Category].label : category ?? "No category";
export const total = (counts: Record<string, number>) => Object.values(counts).reduce((sum, n) => sum + n, 0);
/** Tokens in and out, in thousands. */
export const kiloTokens = (t: TokenCounts | null) => (t === null ? "—" : `${((t.tokensIn + t.tokensOut) / 1000).toFixed(1)}k`);
/** One clause per measure that reached the bar, with its count and share (card://JAVA-1804). An API that predates
 *  `firedBy` answers the violation measure alone, as a share. */
export const recommendationClauses = (r: ProfileRecommendation): string[] =>
  (r.firedBy ?? ["violations"]).map((measure) => measure === "send-backs"
    ? `${r.sentBack ?? 0} of ${r.reviewed} reviews were sent back (${percent(r.sendBackRate ?? null)})`
    : r.violating === undefined
      ? `${percent(r.violationRate)} of ${r.reviewed} reviews broke architecture or clean code`
      : `${r.violating} of ${r.reviewed} reviews broke architecture or clean code (${percent(r.violationRate)})`);
