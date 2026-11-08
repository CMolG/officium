"use client";

import { Trash2 } from "lucide-react";

import { Button, DialogClose, DialogFooter, Text } from "@javadaba/ui";

/**
 * The picker's footer: Remove (replace only), the reason Save is off, Cancel and Save (JAVA-1776). Remove sits apart, on
 * the left, because it is the one action here that takes a role out of the cell.
 */
export function RolePickerFooter({
  mode,
  reason,
  saveDisabled,
  onRemove,
  onSave,
}: {
  mode: "replace" | "add";
  /** Why Save is off, in words, or null when it is on. */
  reason: string | null;
  saveDisabled: boolean;
  /** Set in replace mode only: takes the replaced role out of the cell. */
  onRemove?: () => void;
  onSave: () => void;
}) {
  return (
    <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {onRemove && (
        <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11 text-destructive sm:mr-auto sm:min-h-0" onClick={onRemove}>
          <Trash2 size={14} aria-hidden="true" />
          <Text>Remove from this cell</Text>
        </Button>
      )}
      {reason && <Text className="text-xs text-[color:var(--jd-muted)] sm:mr-auto">{reason}</Text>}
      <DialogClose asChild>
        <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0">
          <Text>Cancel</Text>
        </Button>
      </DialogClose>
      <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" disabled={saveDisabled} onClick={onSave}>
        <Text>{mode === "replace" ? "Replace role" : "Add role"}</Text>
      </Button>
    </DialogFooter>
  );
}
