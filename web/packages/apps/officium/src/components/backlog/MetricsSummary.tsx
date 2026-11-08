import { Bot, Clock3, GitPullRequestArrow, Hourglass, UserRound } from "lucide-react";

import { Table, Text } from "@javadaba/ui";

import { CATEGORY_CONFIG } from "../../lib/backlog/category-config";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import type { Metrics } from "../../lib/backlog/types";
import { formatDate } from "../../lib/backlog/format";
import { formatEstimate } from "../../lib/backlog/value-format";
import { hasData } from "./MetricsComparison";
import { QualitySummaries } from "./QualitySummaries";
import { StatTile } from "./StatTile";
import { TokenFigures } from "./TokenFigures";

export function MetricsSummary({ metrics, projectId }: { metrics: Metrics; projectId: string }) {
  if (!hasData(metrics)) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] px-6 py-12 text-center">
        <p className="text-sm font-semibold text-[color:var(--jd-ink)]">Nothing delivered in this period</p>
        <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">
          No card reached Review or later, and no time was logged between {formatDate(metrics.period.from)} and {formatDate(metrics.period.to)}.
        </p>
      </div>
    );
  }

  // An API older than JAVA-1777 sends no cost per contributor: then there is no column (card://JAVA-1777).
  const pricedColumn = metrics.contributions.some((c) => c.usd !== undefined);

  return (
    <div className="flex flex-col gap-6">
      {/* Two rows of two on a phone, one row of four from `sm` up: two pairs of equal tiles
          whose container turns from a column into a row. */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-row gap-3">
          <StatTile icon={GitPullRequestArrow} label="Delivered" value={String(metrics.delivered)} />
          <StatTile icon={Clock3} label="Hours total" value={metrics.hours.total.toFixed(1)} />
        </div>
        <div className="flex min-w-0 flex-1 flex-row gap-3">
          <StatTile icon={UserRound} label="Manual hours" value={metrics.hours.manual.toFixed(1)} />
          <StatTile icon={Bot} label="Agent hours (imputed)" value={metrics.hours.imputed.toFixed(1)} />
        </div>
      </div>
      <Text className="text-sm text-[color:var(--jd-muted)]">
        {`Refinement ${metrics.hours.refine.toFixed(1)}h · tests ${metrics.hours.test.toFixed(1)}h · work ${metrics.hours.work.toFixed(1)}h`}
      </Text>

      <TokenFigures metrics={metrics} />

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">Contributions</h2>
        {metrics.contributions.length === 0 ? (
          <p className="text-sm text-[color:var(--jd-muted)]">Nobody delivered or logged time in this period.</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <th><Text>Who</Text></th>
                <th data-num><Text>Delivered</Text></th>
                <th data-num><Text>Hours</Text></th>
                {pricedColumn && (
                  <th data-num title="Estimated at API list prices (USD)"><Text>Est. cost</Text></th>
                )}
              </tr>
            </thead>
            <tbody>
              {metrics.contributions.map((c) => (
                <tr key={c.who}>
                  <td className="font-medium">
                    <span className="inline-flex flex-row items-center gap-1.5">
                      {c.kind === "agent" ? <Bot size={13} aria-hidden="true" /> : <UserRound size={13} aria-hidden="true" />}
                      {c.who}
                    </span>
                  </td>
                  <td data-num>{c.delivered}</td>
                  <td data-num><Text>{c.hours.toFixed(2)}h</Text></td>
                  {pricedColumn && (
                    <td data-num>
                      {c.usd === null || c.usd === undefined
                        ? <Text className="text-[color:var(--jd-muted)]">{c.unpricedRows ? "no price" : "—"}</Text>
                        : <Text>{formatEstimate(c.usd)}</Text>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">By category</h2>
        {/* Four columns never shrink below reading width on a phone: the table scrolls sideways. */}
        <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <th><Text>Category</Text></th>
              <th data-num><Text>Delivered</Text></th>
              <th data-num title="Mean time from first moving into In progress to first reaching Review or later"><Text>Mean cycle time</Text></th>
              <th data-num title="Mean logged hours per card, all time"><Text>Mean logged hours</Text></th>
            </tr>
          </thead>
          <tbody>
            {metrics.byCategory.map((row) => (
              <tr key={row.category ?? "none"}>
                <td>{row.category ? CATEGORY_CONFIG[row.category].label : "No category"}</td>
                <td data-num>{row.delivered}</td>
                <td data-num>{row.meanCycleHours === null ? "—" : `${row.meanCycleHours.toFixed(1)}h`}</td>
                <td data-num>{row.meanLoggedHours === null ? "—" : `${row.meanLoggedHours.toFixed(1)}h`}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        </div>
      </section>

      {metrics.longestOpen.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">Longest open</h2>
          <ul className="flex flex-col gap-1.5">
            {metrics.longestOpen.map((c) => (
              <li key={c.key} className="flex flex-row items-center gap-2 text-sm">
                <Hourglass size={13} className="shrink-0 text-[color:var(--jd-muted)]" aria-hidden="true" />
                <span className="font-mono text-xs text-[color:var(--jd-muted)]">{c.key}</span>
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="shrink-0 text-xs text-[color:var(--jd-muted)]">{STATUS_CONFIG[c.status].label} · {(c.ageHours / 24).toFixed(0)}d old</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <QualitySummaries metrics={metrics} projectId={projectId} />
    </div>
  );
}
