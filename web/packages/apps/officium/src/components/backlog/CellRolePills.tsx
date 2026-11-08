"use client";

import { ChevronDown, Plus } from "lucide-react";

import { Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { roleLabel, roleSheetHref } from "../../lib/backlog/role-config";
import { useCopy } from "../../lib/i18n/use-copy";

/** The look of a pill: a control in an editable cell, a plain tag in a read-only one. */
export const PILL = "flex min-h-11 max-w-full flex-row items-center gap-1 rounded-[var(--radius-jd-sm)] px-2 py-1 text-left text-xs wrap-anywhere";
export const CONTROL = `${PILL} cursor-pointer border border-[color:var(--jd-control-border)] bg-[color:var(--jd-raised)] hover:bg-[color:var(--jd-ink)]/[0.06]`;
const ADD = `${PILL} cursor-pointer justify-center border border-dashed border-[color:var(--jd-control-border)] hover:bg-[color:var(--jd-ink)]/[0.06]`;

/**
 * A cell's roles (JAVA-1776). Editable: each role is a pill that opens its replacement dialog, and a `+` adds one. Read
 * only: each role is a pill that leads to its sheet (JAVA-517), and nothing paints as pressable.
 */
export function CellRolePills({
  title,
  roles,
  editable,
  onReplace,
  onAdd,
}: {
  title: string;
  roles: string[];
  editable: boolean;
  onReplace: (role: string) => void;
  onAdd: () => void;
}) {
  const copy = useCopy().workProfile;

  if (!editable) {
    if (roles.length === 0) return <Text className="text-xs text-[color:var(--jd-muted)]">{copy.noRole}</Text>;
    return (
      <ul className="flex flex-row flex-wrap gap-1" aria-label={title}>
        {roles.map((role) => (
          <li key={role} data-role={role} title={role} className="flex max-w-full flex-row">
            <Link href={roleSheetHref(role)} className={`${PILL} bg-[color:var(--jd-ink)]/[0.06] hover:underline`}>
              <Text className="wrap-anywhere">{roleLabel(role)}</Text>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  if (roles.length === 0) {
    return (
      <button type="button" aria-label={`${copy.noRole}: add a role to ${title}`} onClick={onAdd} className={`${ADD} w-fit`}>
        <Plus size={14} aria-hidden="true" />
        <Text>{copy.noRole}</Text>
      </button>
    );
  }

  return (
    <div className="flex flex-row flex-wrap gap-1">
      <ul className="flex flex-row flex-wrap gap-1" aria-label={title}>
        {roles.map((role) => (
          <li key={role} data-role={role} title={role} className="flex max-w-full flex-row">
            <button type="button" aria-label={`Replace ${roleLabel(role)} in ${title}`} onClick={() => onReplace(role)} className={CONTROL}>
              <Text className="wrap-anywhere">{roleLabel(role)}</Text>
              <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" aria-label={`Add a role to ${title}`} onClick={onAdd} className={ADD}>
        <Plus size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
