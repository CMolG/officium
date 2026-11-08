"use client";

import { useRestoreFocus } from "../lib/restore-focus";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./dialog";
import { DialogCloseButton } from "./dialog-close-button";
import { ShortcutKeys } from "./shortcut-keys";
import { Text } from "./text";

export interface ShortcutGroup {
  heading: string;
  shortcuts: { combo: string; label: string }[];
}

export interface ShortcutsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: ShortcutGroup[];
  title?: string;
  /** The line under the groups. Defaults to the rule that every shortcut pauses in a field. */
  note?: string;
  /** The close button's name; a product in another language passes its own. */
  closeLabel?: string;
}

/** The sheet of keys a surface answers to, drawn from the same registry the keys are bound from. */
export function ShortcutsSheet({
  open,
  onOpenChange,
  groups,
  title = "Keyboard shortcuts",
  note = "Shortcuts pause while you type in a field.",
  closeLabel,
}: ShortcutsSheetProps) {
  const restoreFocus = useRestoreFocus();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...restoreFocus} className="max-w-md">
        <DialogHeader className="flex-row items-start justify-between gap-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogCloseButton label={closeLabel} className="max-sm:hidden" />
        </DialogHeader>
        {groups.map((group) => (
          <section key={group.heading} aria-label={group.heading} className="flex flex-col gap-1">
            <Text as="h3" type="kicker" tone="faint" className="!text-[10px]">
              {group.heading}
            </Text>
            <ul className="flex flex-col">
              {group.shortcuts.map((shortcut) => (
                <li key={`${shortcut.combo}-${shortcut.label}`} className="flex min-h-10 flex-row items-center justify-between gap-4 text-sm">
                  <Text>{shortcut.label}</Text>
                  <ShortcutKeys combo={shortcut.combo} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <DialogDescription>{note}</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}
