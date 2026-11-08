"use client";

import { ChevronDown } from "lucide-react";

import { Text } from "@javadaba/ui";

import { modelLabel, runLabel } from "../../lib/backlog/role-matrix";
import type { RunCell } from "../../lib/backlog/role-matrix-types";
import { CONTROL } from "./CellRolePills";

/**
 * A category cell's model (JAVA-1776): a pill that opens the model and effort dialog when the cell is editable, plain
 * text when it is not. The effort sits in its own column.
 */
export function CellModelPill({ title, run, editable, onModel }: { title: string; run: RunCell; editable: boolean; onModel: () => void }) {
  if (!editable) {
    return (
      <Text data-testid="role-cell-model" className="text-sm wrap-anywhere">
        {modelLabel(run.model)}
      </Text>
    );
  }
  return (
    <button type="button" data-testid="role-cell-model" aria-label={`Change the model for ${title}: ${runLabel(run)}`} onClick={onModel} className={`${CONTROL} w-fit`}>
      <span className="wrap-anywhere">{modelLabel(run.model)}</span>
      <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
    </button>
  );
}
