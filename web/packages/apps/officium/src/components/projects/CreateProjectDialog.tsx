"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Label } from "@javadaba/ui";

import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from "../../lib/backlog/project-appearance";
import type { ProjectColor } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { ProjectAppearancePicker } from "./ProjectAppearancePicker";

/** "Platform team" -> "PLA". Strips anything that isn't a letter/digit, uppercases, and pads a
 *  single-letter name so it still satisfies the contract's `^[A-Z][A-Z0-9]{1,9}$`. */
function suggestPrefix(name: string): string {
  const letters = name.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const prefix = letters.slice(0, 4) || "PRJ";
  return /^[A-Z]/.test(prefix) ? prefix : `P${prefix}`.slice(0, 5);
}

export function CreateProjectDialog({
  folderId,
  existingPrefixes,
  onClose,
  onCreate,
}: {
  folderId: string | null;
  existingPrefixes: string[];
  onClose: () => void;
  onCreate: (input: { name: string; keyPrefix: string; folderId: string | null; icon: string; iconColor: ProjectColor }) => void;
}) {
  const [name, setName] = useState("");
  const [prefix, setPrefix] = useState("");
  const [prefixTouched, setPrefixTouched] = useState(false);
  const [icon, setIcon] = useState(DEFAULT_PROJECT_ICON);
  const [iconColor, setIconColor] = useState<ProjectColor>(DEFAULT_PROJECT_COLOR);
  const returnFocus = useReturnFocus();

  const effectivePrefix = prefixTouched ? prefix : suggestPrefix(name);
  const prefixTaken = existingPrefixes.includes(effectivePrefix.toUpperCase());
  const prefixValid = /^[A-Z][A-Z0-9]{1,9}$/.test(effectivePrefix.toUpperCase());
  const canSubmit = name.trim().length > 0 && prefixValid && !prefixTaken;

  function submit() {
    if (!canSubmit) return;
    onCreate({ name: name.trim(), keyPrefix: effectivePrefix.toUpperCase(), folderId, icon, iconColor });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>New project</DialogTitle>
        <DialogDescription>Each project is its own backlog, with its own card keys.</DialogDescription>

        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-end gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Name</span>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Growth"
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </label>
            <ProjectAppearancePicker icon={icon} color={iconColor} onChange={({ icon: i, color: c }) => { setIcon(i); setIconColor(c); }} />
          </div>
          <label className="flex flex-col gap-1.5">
            <Label className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Card key prefix</Label>
            <Input
              value={effectivePrefix}
              onChange={(e) => {
                setPrefixTouched(true);
                setPrefix(e.target.value.toUpperCase());
              }}
              placeholder="OFF"
              maxLength={10}
              aria-invalid={!prefixValid || prefixTaken}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <span className="text-xs text-[color:var(--jd-muted)]">
              Cards will be {effectivePrefix || "…"}-1, {effectivePrefix || "…"}-2…
            </span>
            {prefixTaken && (
              <span role="alert" className="text-xs font-bold text-destructive">
                That prefix is already used by another project.
              </span>
            )}
            {/* The disabled button said nothing for an invalid prefix, only `aria-invalid` did. */}
            {!prefixValid && effectivePrefix !== "" && (
              <span role="alert" className="text-xs font-bold text-destructive">
                2 to 10 letters or digits, starting with a letter.
              </span>
            )}
          </label>
        </div>

        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" register="ui" disabled={!canSubmit} onClick={submit}>
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
