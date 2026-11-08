"use client";

import { ChevronDown } from "lucide-react";

import { Badge, Text } from "@javadaba/ui";

import { PHASE_LABEL } from "../../lib/backlog/role-config";
import { PHASES, isOverridden, type CellRef } from "../../lib/backlog/role-matrix";
import type { RoleMatrix } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";
import type { CellChange } from "../../lib/profiles/cell-change";
import type { MatrixRow } from "../backlog/matrix-rows";
import { MatrixPhaseRow } from "./MatrixPhaseRow";

/**
 * One group of a matrix (JAVA-243): a category or a signal, with one row per phase (JAVA-1775). In a table it is a
 * labelled block; below a container of 48rem it folds, except when `foldAlways` (a profile's rows fold on every width).
 */
export function MatrixGroup({
  row,
  draft,
  base,
  editable,
  markCustom,
  baseName,
  foldAlways,
  projectId,
  runs,
  expanded,
  onChange,
  onToggle,
}: {
  row: MatrixRow;
  draft: RoleMatrix;
  base: RoleMatrix;
  editable: boolean;
  markCustom: boolean;
  /** What the base is called, for the cells' notes and resets: the active profile's name, or Officium's defaults. */
  baseName: string;
  foldAlways: boolean;
  projectId?: string;
  runs: boolean;
  expanded: boolean;
  onChange: (change: CellChange) => void;
  onToggle: () => void;
}) {
  const copy = useCopy().workProfile;
  const custom = markCustom ? PHASES.filter((phase) => isOverridden(draft, base, { kind: row.kind, row: row.row, phase })).length : 0;
  // The label folds on a phone; a profile's rows fold on every width, so their label is never shown twice.
  const foldClass = foldAlways ? "" : "@3xl:hidden";

  return (
    <div data-testid="role-row" data-row={row.row} role="rowgroup" className="flex flex-col py-2">
      <div role="row" className="flex flex-row items-center gap-2 pb-1">
        <div role="rowheader" className="flex min-w-0 flex-1 flex-row items-center">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            className={`flex min-h-11 min-w-0 flex-1 flex-row items-center gap-2 text-left ${foldClass}`}
          >
            <Text className="min-w-0 flex-1 text-sm font-semibold wrap-anywhere">{row.label}</Text>
            {custom > 0 && (
              <Badge register="tag" tone="accent" fill="subtle" size="xs">
                {copy.customCount(custom)}
              </Badge>
            )}
            <ChevronDown size={16} aria-hidden="true" className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
          {!foldAlways && <Text className="hidden text-sm font-semibold wrap-anywhere @3xl:block">{row.label}</Text>}
        </div>
      </div>
      <div className={`${expanded ? "flex" : "hidden"} min-w-0 flex-col ${foldAlways ? "" : "@3xl:flex"}`}>
        {PHASES.map((phase) => {
          const cell: CellRef = { kind: row.kind, row: row.row, phase };
          return (
            <MatrixPhaseRow
              key={phase}
              cell={cell}
              title={`${row.label} · ${PHASE_LABEL[phase]}`}
              draft={draft}
              base={base}
              editable={editable}
              markCustom={markCustom}
              baseName={baseName}
              runs={runs}
              projectId={projectId}
              onChange={onChange}
            />
          );
        })}
      </div>
    </div>
  );
}
