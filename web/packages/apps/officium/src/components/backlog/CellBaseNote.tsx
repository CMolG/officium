"use client";

import { Text } from "@javadaba/ui";

import { describeCell, type CellRef } from "../../lib/backlog/role-matrix";
import { roleLabel } from "../../lib/backlog/role-config";
import type { RoleMatrix } from "../../lib/backlog/types";
import { useCopy } from "../../lib/i18n/use-copy";

/** What a project's own cell replaces: the cell the base (the active profile, else the defaults) gives it (JAVA-1627). */
export function CellBaseNote({ base, cell, baseName }: { base: RoleMatrix; cell: CellRef; baseName: string }) {
  const copy = useCopy().workProfile;
  return (
    <Text data-testid="role-cell-base" className="text-xs text-[color:var(--jd-muted)]">
      {copy.insteadOf(baseName, describeCell(base, cell, roleLabel))}
    </Text>
  );
}
