"use client";

import { Table, Text } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import type { Metrics } from "../../lib/backlog/types";

/** No delivery and no hours: nothing was measured, which is different from "measured, and it was
 *  zero" -- a comparison shows this as empty, never as a false delta (JAVA-56 acceptance
 *  criterion). */
export function hasData(m: Metrics): boolean {
  return m.delivered > 0 || m.hours.total > 0 || m.contributions.length > 0 || (m.rejected?.total ?? 0) > 0 || (m.reviewReturns?.total ?? 0) > 0;
}

/** Side by side, with a signed delta -- text AND sign, never color alone (`interface-psychology.md`
 *  #4). A period with no data shows as empty, not folded into a false "-N" delta (JAVA-56). */
export function MetricsComparison({ a, b }: { a: Metrics; b: Metrics }) {
  const aHas = hasData(a);
  const bHas = hasData(b);
  const rows: { label: string; a: number | null; b: number | null; unit?: string }[] = [
    { label: "Delivered", a: aHas ? a.delivered : null, b: bHas ? b.delivered : null },
    { label: "Rejected", a: aHas ? (a.rejected?.total ?? 0) : null, b: bHas ? (b.rejected?.total ?? 0) : null },
    { label: "Sent back", a: aHas ? (a.reviewReturns?.total ?? 0) : null, b: bHas ? (b.reviewReturns?.total ?? 0) : null },
    { label: "Hours total", a: aHas ? a.hours.total : null, b: bHas ? b.hours.total : null, unit: "h" },
    { label: "Manual hours", a: aHas ? a.hours.manual : null, b: bHas ? b.hours.manual : null, unit: "h" },
    { label: "Agent hours", a: aHas ? a.hours.imputed : null, b: bHas ? b.hours.imputed : null, unit: "h" },
  ];
  return (
    <div>
      <p className="mb-2 text-xs text-[color:var(--jd-muted)]">
        A: {formatDate(a.period.from)} — {formatDate(a.period.to)} · B: {formatDate(b.period.from)} — {formatDate(b.period.to)}
      </p>
      <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th><Text>Metric</Text></th>
            <th data-num><Text>A</Text></th>
            <th data-num><Text>B</Text></th>
            <th data-num><Text>Δ (B − A)</Text></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const empty = row.a === null || row.b === null;
            const delta = empty ? null : row.b! - row.a!;
            const sign = delta !== null && delta > 0 ? "+" : "";
            return (
              <tr key={row.label}>
                <td className="font-medium">{row.label}</td>
                <td data-num>{row.a === null ? "No data" : `${row.a.toFixed(row.unit ? 1 : 0)}${row.unit ?? ""}`}</td>
                <td data-num>{row.b === null ? "No data" : `${row.b.toFixed(row.unit ? 1 : 0)}${row.unit ?? ""}`}</td>
                <td className="font-semibold">
                  {delta === null ? "—" : `${sign}${delta.toFixed(row.unit ? 1 : 0)}${row.unit ?? ""}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      </div>
    </div>
  );
}
