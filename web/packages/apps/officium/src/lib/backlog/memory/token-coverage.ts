// The token coverage of a period (card://JAVA-1588): the memory twin of the API's TokenCoverage. A delivery is covered
// when its card carries tokens from some session, all time; manual hours never carry tokens, so they are left out.
import type { TokenCounts, TokenCoverage } from "../metrics-types";

interface TokenEntry {
  hours: number;
  source: string;
  tokensIn: number | null;
  cachedTokensIn: number | null;
  reasoningTokens: number | null;
  tokensOut: number | null;
}

const share = (part: number, whole: number): number | null => (whole === 0 ? null : part / whole);

/** `delivered` are the card ids delivered in the period; `timeOf` reads a card's entries, all time; `periodEntries`
 *  are the period's. `perDelivery` averages the covered deliveries' tokens, null when none is covered. */
export function tokenCoverageIn(
  delivered: readonly string[],
  timeOf: (cardId: string) => readonly TokenEntry[],
  periodEntries: readonly TokenEntry[],
): { view: TokenCoverage; perDelivery: TokenCounts | null } {
  const recorded = (cardId: string) => timeOf(cardId).filter((e) => e.tokensOut !== null);
  const covered = delivered.filter((cardId) => recorded(cardId).length > 0);
  const sum: TokenCounts = { tokensIn: 0, cachedTokensIn: 0, reasoningTokens: 0, tokensOut: 0 };
  for (const cardId of covered) {
    for (const e of recorded(cardId)) {
      sum.tokensIn += e.tokensIn ?? 0;
      sum.cachedTokensIn += e.cachedTokensIn ?? 0;
      sum.reasoningTokens += e.reasoningTokens ?? 0;
      sum.tokensOut += e.tokensOut ?? 0;
    }
  }
  const scale = covered.length ? 1 / covered.length : 0;
  const perDelivery = covered.length
    ? {
        tokensIn: Math.floor(sum.tokensIn * scale),
        cachedTokensIn: Math.floor(sum.cachedTokensIn * scale),
        reasoningTokens: Math.floor(sum.reasoningTokens * scale),
        tokensOut: Math.floor(sum.tokensOut * scale),
      }
    : null;

  const agent = periodEntries.filter((e) => e.source !== "manual");
  const agentHours = agent.reduce((total, e) => total + e.hours, 0);
  const withTokens = agent.filter((e) => e.tokensOut !== null).reduce((total, e) => total + e.hours, 0);
  return {
    view: {
      deliveries: delivered.length,
      covered: covered.length,
      deliveredShare: share(covered.length, delivered.length),
      agentHours,
      agentHoursWithTokens: withTokens,
      hoursShare: share(withTokens, agentHours),
      warnBelow: 0.8,
    },
    perDelivery,
  };
}
