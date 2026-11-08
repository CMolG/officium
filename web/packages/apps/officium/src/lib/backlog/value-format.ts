// Money, ratios and months of the value report (card://JAVA-1047), shown in American English.

export const formatMoney = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export const formatFigure = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

/** An estimate at API list prices (card://JAVA-1777): a small cost reads "<$0.01", never a rounded zero. */
export function formatEstimate(usd: number): string {
  return usd > 0 && usd < 0.01 ? "<$0.01" : formatMoney.format(usd);
}

/** A ratio below 0.1 reads "<0.1×", not "0×": a measured small value is not zero. */
export function formatRatio(value: number): string {
  return value > 0 && value < 0.1 ? "<0.1×" : `${formatFigure.format(value)}×`;
}

/** yyyy-mm of a month, moved by whole months (UTC). */
export function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** A split's key as a label: a wire name such as "technicalDebt" reads as "technical debt". */
export function labelOf(key: string): string {
  return key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}
