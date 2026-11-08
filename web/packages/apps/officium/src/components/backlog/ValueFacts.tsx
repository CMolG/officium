import type { ValueFigures } from "../../lib/backlog/value-types";
import { formatFigure } from "../../lib/backlog/value-format";

/** What the month's figures rest on: the imputed cards, the unattended hours, the prices left out (card://JAVA-1047). */
export function ValueFacts({ current }: { current: ValueFigures }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        {current.delivered} {current.delivered === 1 ? "card" : "cards"} delivered
        {current.imputed > 0 ? `, ${current.imputed} with imputed hours (their category's mean)` : ""}.
      </p>
      <p>
        {formatFigure.format(current.unattendedHours)} of {formatFigure.format(current.classifiedHours)} agent hours
        ran with nobody at the keyboard.
      </p>
      {current.unpricedRows > 0 ? (
        <p className="text-[color:var(--jd-muted)]">
          {current.unpricedRows} usage rows are left out of the value: no price for{" "}
          {current.unpricedModels.join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
