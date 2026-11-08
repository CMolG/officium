"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Select } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import type { Folder } from "../../lib/backlog/types";

/** The folder and every folder under it: a folder cannot move into itself or into what it holds. */
function descendants(folder: Folder, all: readonly Folder[]): Set<string> {
  const found = new Set<string>([folder.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of all) {
      if (f.parentId && found.has(f.parentId) && !found.has(f.id)) {
        found.add(f.id);
        grew = true;
      }
    }
  }
  return found;
}

const TOP = "__top__";

/** "Move to…" for a folder (Off-Home): where it goes, the top of the workspace or another folder. */
export function MoveFolderDialog({
  folder,
  folders,
  onClose,
  onMove,
}: {
  folder: Folder;
  folders: readonly Folder[];
  onClose: () => void;
  onMove: (parentId: string | null) => void;
}) {
  const returnFocus = useReturnFocus();
  const blocked = descendants(folder, folders);
  const [target, setTarget] = useState(folder.parentId ?? TOP);
  const options = [
    { value: TOP, label: "All projects (the top)" },
    ...folders.filter((f) => !blocked.has(f.id)).map((f) => ({ value: f.id, label: f.name })),
  ];
  const unchanged = target === (folder.parentId ?? TOP);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>Move {folder.name}</DialogTitle>
        <DialogDescription>Choose where this folder and everything in it goes.</DialogDescription>
        <Select aria-label="Move to" value={target} onChange={setTarget} options={options} />
        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" register="ui" disabled={unchanged} onClick={() => onMove(target === TOP ? null : target)}>
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
