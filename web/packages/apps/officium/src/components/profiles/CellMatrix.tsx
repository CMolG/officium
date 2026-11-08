"use client";

import { useState } from "react";

import { Text } from "@javadaba/ui";

import type { RoleMatrix } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";
import type { CellChange } from "../../lib/profiles/cell-change";
import type { MatrixRow } from "../backlog/matrix-rows";
import { MatrixGroup } from "./MatrixGroup";

export interface MatrixSection {
  heading?: string;
  explanation?: string;
  rows: MatrixRow[];
}

interface Props {
  sections: MatrixSection[];
  draft: RoleMatrix;
  /** What the draft's cells are compared with: the active profile's matrix, else Officium's defaults, else a profile's defaults. */
  base: RoleMatrix;
  /** What `base` is called in the cells' notes and resets: the active profile's name, or Officium's defaults (JAVA-1627). */
  baseName: string;
  /** Whether a cell that differs from `base` is marked Custom: the project's cells are, a profile's are not. */
  markCustom: boolean;
  editable: boolean;
  /** Rows fold on every width, not only below a 48rem container. */
  foldAlways: boolean;
  projectId?: string;
  onChange: (change: CellChange) => void;
}

/**
 * The one matrix of the Work Profile page (JAVA-1627): the project's cells and a profile's cells are both drawn here, so
 * a cell reads and edits the same way in either. It is an ARIA table, one per section, keyed to its own container
 * (JAVA-1775): a group per category or signal, one row per phase, a model and an effort on the category rows. Each cell
 * opens its own dialog to change its roles, model and mods (JAVA-1776); this component only owns which rows are open.
 */
export function CellMatrix({ sections, draft, base, baseName, markCustom, editable, foldAlways, projectId, onChange }: Props) {
  const copy = useCopy().workProfile;
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="@container flex flex-col gap-8">
      {sections.map((section) => {
        // The category rows carry a model and an effort per phase; the signal rows have none, so their table has no such columns.
        const runs = section.rows[0]?.kind === "categories";
        return (
          <section key={section.heading ?? "rows"} className="flex flex-col gap-2" aria-label={section.heading}>
            {section.heading && (
              <div className="flex flex-col gap-1">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">{section.heading}</h2>
                {section.explanation && <Text as="p" className="text-sm text-[color:var(--jd-muted)]">{section.explanation}</Text>}
              </div>
            )}
            <div role="table" aria-label={section.heading} className="flex flex-col">
              <div role="row" className="flex flex-row gap-2 border-b border-[color:var(--jd-line)] pb-2 sr-only @3xl:not-sr-only">
                <div role="columnheader" className="text-xs font-bold uppercase text-[color:var(--jd-muted)] @3xl:w-40 @3xl:shrink-0">
                  {copy.columnPhase}
                </div>
                <div role="columnheader" className="text-xs font-bold uppercase text-[color:var(--jd-muted)] @3xl:min-w-0 @3xl:flex-1">
                  {copy.columnRoles}
                </div>
                {runs && (
                  <div role="columnheader" className="text-xs font-bold uppercase text-[color:var(--jd-muted)] @3xl:w-36 @3xl:shrink-0">
                    {copy.columnModel}
                  </div>
                )}
                {runs && (
                  <div role="columnheader" className="text-xs font-bold uppercase text-[color:var(--jd-muted)] @3xl:w-24 @3xl:shrink-0">
                    {copy.columnEffort}
                  </div>
                )}
              </div>
              {section.rows.map((r) => {
                const key = `${r.kind}:${r.row}`;
                return (
                  <MatrixGroup
                    key={key}
                    row={r}
                    draft={draft}
                    base={base}
                    editable={editable}
                    markCustom={markCustom}
                    baseName={baseName}
                    foldAlways={foldAlways}
                    projectId={projectId}
                    runs={runs}
                    expanded={open.has(key)}
                    onChange={onChange}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
