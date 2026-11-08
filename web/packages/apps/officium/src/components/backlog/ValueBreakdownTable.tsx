import type { ValueLine } from "../../lib/backlog/value-types";
import { formatFigure, formatMoney, labelOf } from "../../lib/backlog/value-format";

/** One split of the value report (category, phase or model): each line's hours and API-equivalent value,
 *  in the order the API gave them (card://JAVA-1047). Flex rows, not a table, so it draws the same on Android. */
export function ValueBreakdownTable({ title, lines }: { title: string; lines: ValueLine[] }) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col gap-2">
      <p className="text-xs font-semibold text-[color:var(--jd-muted)]">{title}</p>
      <div className="flex flex-row gap-3 text-xs text-[color:var(--jd-muted)]">
        <span className="min-w-0 flex-1">Name</span>
        <span className="w-20 text-right">Hours</span>
        <span className="w-24 text-right">API value</span>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-[color:var(--jd-muted)]">Nothing to split.</p>
      ) : (
        lines.map((line) => (
          <div key={line.key} className="flex flex-row gap-3 border-t border-[color:var(--jd-line)] pt-2 text-sm">
            <span className="min-w-0 flex-1 break-words">{labelOf(line.key)}</span>
            <span className="w-20 text-right">{formatFigure.format(line.hours)}</span>
            <span className="w-24 text-right">{formatMoney.format(line.apiValue)}</span>
          </div>
        ))
      )}
    </section>
  );
}
