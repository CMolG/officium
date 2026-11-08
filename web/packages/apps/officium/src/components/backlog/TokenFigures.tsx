import { Info } from "lucide-react";

import { Table, Text } from "@javadaba/ui";

import type { Metrics } from "../../lib/backlog/types";
import { formatTokens } from "../../lib/backlog/format";
import { formatEstimate } from "../../lib/backlog/value-format";

/** Whole percent of a share, or a dash over nothing (card://JAVA-1588). */
const percent = (share: number | null) => (share === null ? "–" : `${Math.round(share * 100)}%`);

/** The period's agent tokens: the per-card figures, how much of the period recorded tokens, and the tokens by model.
 *  Coverage is absent from an API older than JAVA-1588, and then so are the coverage line and the per-card figures. */
export function TokenFigures({ metrics }: { metrics: Metrics }) {
  const coverage = metrics.tokenCoverage;
  const perCard = metrics.tokens.perDelivery;
  const shown = metrics.tokens.byModel.length > 0 || (coverage !== undefined && coverage.deliveries > 0);
  if (!shown) {
    return null;
  }
  const partial = coverage !== undefined
    && [coverage.deliveredShare, coverage.hoursShare].some((share) => share !== null && share < coverage.warnBelow);

  const cost = metrics.tokens.cost;
  // An API older than JAVA-1777 sends no cost: then there is no cost line and no column (card://JAVA-1777).
  const pricedColumn = cost !== undefined;

  return (
    <section className="flex flex-col gap-4">
      {cost && (cost.usd !== null || cost.unpricedRows > 0) && (
        <div className="flex flex-col gap-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">Estimated API cost</h2>
          {cost.usd !== null && <Text data-num className="text-2xl font-semibold">{formatEstimate(cost.usd)}</Text>}
          <Text className="text-sm text-[color:var(--jd-muted)]">
            At the providers&apos; API list prices, in USD. It is not what a plan charges. Usage reported before cache
            writes were recorded separately counts them as input, so earlier periods read low.
          </Text>
          {cost.unpricedRows > 0 && (
            <Text className="text-sm text-[color:var(--jd-muted)]">
              {`Left out of the cost: ${cost.unpricedRows} usage ${cost.unpricedRows === 1 ? "row" : "rows"} with no price for ${cost.unpricedModels.join(", ")}.`}
            </Text>
          )}
        </div>
      )}
      {coverage && (
        <div className="flex flex-col gap-2">
          {perCard && (
            <>
              <h2 className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">Per delivered card</h2>
              <Text data-num>
                {`In ${formatTokens(perCard.tokensIn)} · Cached ${formatTokens(perCard.cachedTokensIn)} · Out ${formatTokens(perCard.tokensOut)}`}
              </Text>
            </>
          )}
          <Text className="text-sm text-[color:var(--jd-muted)]">
            {`Recorded for ${coverage.covered} of ${coverage.deliveries} deliveries (${percent(coverage.deliveredShare)}) and ${percent(coverage.hoursShare)} of agent hours`}
          </Text>
          {partial && (
            <p role="status" className="flex flex-row items-start gap-2 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3 py-2 text-sm text-[color:var(--jd-ink)]">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              <Text>
                {`Only part of the period recorded tokens, so the per-card figures cover just those deliveries.`}
              </Text>
            </p>
          )}
        </div>
      )}

      {metrics.tokens.byModel.length > 0 && (
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">Agent tokens by model</h2>
          {/* Five columns never shrink below reading width on a phone: the table scrolls sideways. */}
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th><Text>Model</Text></th>
                  <th data-num title="Input read at full price: fresh input and cache writes"><Text>In</Text></th>
                  <th data-num title="Input read from the prompt cache"><Text>Cached</Text></th>
                  <th data-num><Text>Out</Text></th>
                  <th data-num title="The thinking part of Out"><Text>Thinking</Text></th>
                  {pricedColumn && (
                    <th data-num title="Estimated at API list prices (USD)"><Text>Est. cost</Text></th>
                  )}
                </tr>
              </thead>
              <tbody>
                {[...metrics.tokens.byModel, { ...metrics.tokens, model: "Total", usd: cost?.usd ?? null }].map((row) => (
                  <tr key={row.model} className={row.model === "Total" ? "font-semibold" : undefined}>
                    <td className="font-mono text-xs"><Text>{row.model}</Text></td>
                    <td data-num><Text>{formatTokens(row.tokensIn)}</Text></td>
                    <td data-num><Text>{formatTokens(row.cachedTokensIn)}</Text></td>
                    <td data-num><Text>{formatTokens(row.tokensOut)}</Text></td>
                    <td data-num><Text>{formatTokens(row.reasoningTokens)}</Text></td>
                    {pricedColumn && (
                      <td data-num>
                        {row.usd === null || row.usd === undefined
                          ? <Text className="text-[color:var(--jd-muted)]">no price</Text>
                          : <Text>{formatEstimate(row.usd)}</Text>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </section>
  );
}
