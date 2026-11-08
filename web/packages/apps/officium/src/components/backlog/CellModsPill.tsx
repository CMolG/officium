"use client";

import { ChevronDown } from "lucide-react";

import { Text } from "@javadaba/ui";

import { useCopy } from "../../lib/i18n/use-copy";
import { CONTROL } from "./CellRolePills";

/**
 * A cell's mods (JAVA-1776): a pill that opens the mods dialog when the cell is editable, the count as text when it is
 * not, and nothing at all for a read-only cell with no mods.
 */
export function CellModsPill({ title, mods, editable, onMods }: { title: string; mods: string[]; editable: boolean; onMods: () => void }) {
  const copy = useCopy().workProfile;
  if (!editable) {
    return mods.length > 0 ? (
      <Text data-testid="role-cell-mods" className="text-xs wrap-anywhere text-[color:var(--jd-muted)]">
        {copy.modCount(mods.length)}
      </Text>
    ) : null;
  }
  const shown = mods.length === 0 ? copy.noMods : copy.modCount(mods.length);
  return (
    <button type="button" data-testid="role-cell-mods" aria-label={`Change the mods for ${title}: ${shown}`} onClick={onMods} className={`${CONTROL} w-fit`}>
      <span className="wrap-anywhere">{shown}</span>
      <ChevronDown size={14} aria-hidden="true" className="shrink-0" />
    </button>
  );
}
