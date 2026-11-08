import { Link } from "@javadaba/ui/navigation";
import { Text } from "@javadaba/ui";

import { categoryColor, categorySheetHref } from "../../lib/backlog/category-config";
import { DEFAULT_ROLE_MATRIX, PHASE_LABEL, PHASE_STATUS, SIGNAL_LABEL } from "../../lib/backlog/role-config";
import { PHASES, phaseDelta, roleCells, roleSignalCells } from "../../lib/backlog/role-matrix";
import type { Project, RoleMatrix, Signal } from "../../lib/backlog/types";
import { StatusShape } from "../backlog/StatusShape";
import { MATRIX_ROWS, rowCategory, rowLabel } from "./RoleFingerprint";
import { HandNote, KICKER } from "./SheetParts";

const listFormat = (items: string[]) => new Intl.ListFormat("en", { type: "conjunction" }).format(items);

/** The workflow left to right, one polygon per phase, the categories the role works in each. */
export function RolePhaseTrack({ matrix, role, project }: { matrix: RoleMatrix; role: string; project: Project | null }) {
  const cells = roleCells(matrix, role);
  const signals = roleSignalCells(matrix, role);
  const removedEverything = project !== null && cells.length === 0 && roleCells(DEFAULT_ROLE_MATRIX, role).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {removedEverything && (
        <Text as="p" className="text-sm">
          <Text className="font-semibold">{`${project.name} doesn't use this role.`}</Text>{" "}
          <Text className="text-[color:var(--jd-muted)]">Its project matrix removed every cell this role had.</Text>
        </Text>
      )}
      <ol aria-label="Phases" className="flex flex-col overflow-hidden rounded-[var(--radius-jd-xl)] border border-[color:var(--jd-line)] lg:flex-row">
        {PHASES.map((phase, i) => {
          const rows = MATRIX_ROWS.filter((row) => cells.some((c) => c.row === row && c.phase === phase));
          const delta = project ? phaseDelta(matrix, DEFAULT_ROLE_MATRIX, role, phase) : { added: [], removed: [] };
          return (
            <li
              key={phase}
              data-testid="role-phase"
              data-phase={phase}
              className={`relative flex min-w-0 flex-1 flex-col gap-3 p-4 ${i > 0 ? "border-t border-[color:var(--jd-line)] lg:border-t-0 lg:border-l" : ""} ${rows.length === 0 ? "bg-muted" : ""}`}
            >
              <div className="flex flex-row items-center gap-2">
                <StatusShape status={PHASE_STATUS[phase]} className="size-5 shrink-0" />
                <Text className="min-w-0 flex-1 font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.2em]">
                  {PHASE_LABEL[phase]}
                </Text>
              </div>
              {/* On a line of its own: beside the phase name it collides in a narrow column. */}
              {project && (delta.added.length > 0 || delta.removed.length > 0) && (
                <HandNote
                  className="-mt-1 -rotate-3 self-end"
                  spoken={overrideSentence(project.name, delta)}
                >
                  {[delta.added.length > 0 && `+${delta.added.length}`, delta.removed.length > 0 && `−${delta.removed.length}`].filter(Boolean).join(" ") + " here"}
                </HandNote>
              )}
              {rows.length > 0 ? (
                <ul className="flex flex-row flex-wrap gap-1.5">
                  {rows.map((row) => (
                    <li key={row} className="flex max-w-full flex-row">
                      <Link
                        href={categorySheetHref(rowCategory(row))}
                        className="flex min-h-11 max-w-full flex-row items-stretch gap-2 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] py-1 pr-3 pl-2 text-sm font-semibold hover:border-[color:var(--jd-control-border)]"
                      >
                        <span aria-hidden="true" className="w-1 shrink-0 rounded-full" style={{ background: categoryColor(rowCategory(row)) }} />
                        <Text className="min-w-0 self-center break-words">{rowLabel(row)}</Text>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text className="text-sm text-[color:var(--jd-muted)]">No cards in this phase.</Text>
              )}
            </li>
          );
        })}
      </ol>
      {signals.length > 0 && (
        <div className="flex flex-row flex-wrap items-center gap-2.5">
          <Text id="role-signals" className={KICKER}>
            Also brought in by
          </Text>
          <ul aria-labelledby="role-signals" className="flex flex-row flex-wrap gap-2">
            {signals.map(({ row, phase }) => (
              <li
                key={`${row}/${phase}`}
                className="rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] px-2 py-1.5 font-[family-name:var(--font-jd-kicker)] text-xs font-bold uppercase tracking-[0.12em]"
              >
                <Text>{`${SIGNAL_LABEL[row as Signal] ?? row} → ${PHASE_LABEL[phase]}`}</Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function overrideSentence(project: string, delta: { added: string[]; removed: string[] }): string {
  const parts = [
    delta.added.length > 0 && `adds ${listFormat(delta.added.map(rowLabel))}`,
    delta.removed.length > 0 && `removes ${listFormat(delta.removed.map(rowLabel))}`,
  ].filter(Boolean);
  return `${project} ${parts.join(" and ")} here, against the default.`;
}
