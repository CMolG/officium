import { Text } from "@javadaba/ui";

import { CATEGORY_CONFIG, CATEGORY_ORDER, categoryColor } from "../../lib/backlog/category-config";
import { PHASE_LABEL, PHASE_STATUS } from "../../lib/backlog/role-config";
import { PHASES, cellOf } from "../../lib/backlog/role-matrix";
import type { Category, Phase, RoleMatrix } from "../../lib/backlog/types";
import { StatusShape } from "../backlog/StatusShape";

/** The matrix's category rows: the fifteen categories, then the spike's UX/UI subtype. */
export const MATRIX_ROWS: readonly string[] = [...CATEGORY_ORDER, "spike/ux-ui"];

/** A matrix row in words: "Bug", "Spike · UX/UI". */
export function rowLabel(row: string): string {
  return row === "spike/ux-ui" ? "Spike · UX/UI" : CATEGORY_CONFIG[row as Category].label;
}

/** The category a row is coloured and explained by. */
export function rowCategory(row: string): Category {
  return (row === "spike/ux-ui" ? "spike" : row) as Category;
}

const holds = (matrix: RoleMatrix, row: string, phase: Phase, role: string) =>
  cellOf(matrix, { kind: "categories", row, phase }).includes(role);

/**
 * A role's fingerprint (JAVA-516's design): five phase rows by sixteen category cells, filled in
 * the category's colour where the role works it. It stands where another sheet would carry a
 * doodle -- 31 roles can't each get commissioned art, and this shape is the role's own data
 * (art-direction axis 2). A cell the viewed project changed from the default is outlined dashed,
 * and the words (the caption, the phase track's notes) say so too: never colour alone.
 */
export function RoleFingerprint({ matrix, defaults, role }: { matrix: RoleMatrix; defaults: RoleMatrix; role: string }) {
  const worked = PHASES.map((phase) => ({ phase, rows: MATRIX_ROWS.filter((row) => holds(matrix, row, phase, role)) }));
  const total = worked.reduce((sum, p) => sum + p.rows.length, 0);
  const phases = worked.filter((p) => p.rows.length > 0).length;
  const changed = PHASES.some((phase) => MATRIX_ROWS.some((row) => holds(matrix, row, phase, role) !== holds(defaults, row, phase, role)));
  const described = worked
    .map(({ phase, rows }) => `${PHASE_LABEL[phase]}: ${rows.length > 0 ? rows.map(rowLabel).join(", ") : "none"}`)
    .join(". ");

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div role="img" aria-label={`Where this role works. ${described}.`} data-testid="role-fingerprint" className="flex flex-col gap-0.5">
        {PHASES.map((phase) => (
          <div key={phase} className="flex flex-row items-center gap-0.5">
            <div className="flex w-16 shrink-0 flex-row items-center gap-1.5">
              <StatusShape status={PHASE_STATUS[phase]} className="size-3.5 shrink-0" />
              <Text className="truncate font-[family-name:var(--font-jd-kicker)] text-[10px] font-bold uppercase tracking-wider text-[color:var(--jd-muted)]">
                {phase === "action" ? "Action" : PHASE_LABEL[phase]}
              </Text>
            </div>
            {MATRIX_ROWS.map((row) => {
              const on = holds(matrix, row, phase, role);
              const differs = on !== holds(defaults, row, phase, role);
              return (
                <div
                  key={row}
                  data-testid="fingerprint-cell"
                  data-row={row}
                  data-phase={phase}
                  data-on={on}
                  data-changed={differs}
                  className={`aspect-square min-w-0 flex-1 rounded-sm border ${on ? "border-transparent" : "border-[color:var(--jd-line)]"} ${differs ? "outline-2 outline-offset-1 outline-dashed outline-[color:var(--jd-ink)]" : ""}`}
                  style={on ? { background: categoryColor(rowCategory(row)) } : undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-row flex-wrap items-baseline justify-between gap-3">
        <Text className="font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--jd-muted)]">
          {`Works ${total} of ${MATRIX_ROWS.length * PHASES.length} cells · ${phases} ${phases === 1 ? "phase" : "phases"}`}
        </Text>
        {changed && (
          <Text className="flex flex-row items-center gap-1.5 font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.2em]">
            <span aria-hidden="true" className="inline-block size-2.5 outline-2 outline-dashed outline-[color:var(--jd-ink)]" />
            <Text>Changed in this project</Text>
          </Text>
        )}
      </div>
    </div>
  );
}

/** The same shape at index size, next to the role's name and count: decoration, `aria-hidden`. */
export function MiniFingerprint({ matrix, role }: { matrix: RoleMatrix; role: string }) {
  return (
    <div aria-hidden="true" className="hidden w-28 shrink-0 flex-col gap-px sm:flex">
      {PHASES.map((phase) => (
        <div key={phase} className="flex flex-row gap-px">
          {MATRIX_ROWS.map((row) => {
            const on = holds(matrix, row, phase, role);
            return (
              <div
                key={row}
                className={`aspect-square min-w-0 flex-1 ${on ? "" : "bg-[color:var(--jd-line)]"}`}
                style={on ? { background: categoryColor(rowCategory(row)) } : undefined}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
