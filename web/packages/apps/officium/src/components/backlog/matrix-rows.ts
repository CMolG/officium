import { CATEGORY_CONFIG, CATEGORY_ORDER } from "../../lib/backlog/category-config";
import { SIGNAL_LABEL, SIGNAL_ORDER } from "../../lib/backlog/role-config";
import { rowLabel } from "../settings/RoleFingerprint";
import type { RowKind } from "../../lib/backlog/role-matrix";

/** One row of a role matrix: which kind of row it is, its key, and the words a person reads for it (JAVA-243). */
export interface MatrixRow {
  kind: RowKind;
  row: string;
  label: string;
}

/** The category rows of a matrix, in the board's order. */
export const CATEGORY_ROWS: MatrixRow[] = [
  ...CATEGORY_ORDER.map((c) => ({ kind: "categories" as const, row: c, label: CATEGORY_CONFIG[c].label })),
  // A spike whose subtype is ux-ui reads this row (JAVA-391).
  { kind: "categories", row: "spike/ux-ui", label: rowLabel("spike/ux-ui") },
];

/** The signal rows of a matrix: a card that carries a signal gets these roles on top of its category's. */
export const SIGNAL_ROWS: MatrixRow[] = SIGNAL_ORDER.map((s) => ({ kind: "signals", row: s, label: SIGNAL_LABEL[s] }));
