"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";

export function CreateFolderDialog({
  parentId,
  onClose,
  onCreate,
}: {
  parentId: string | null;
  onClose: () => void;
  onCreate: (input: { name: string; parentId: string | null }) => void;
}) {
  const [name, setName] = useState("");
  const returnFocus = useReturnFocus();

  function submit() {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), parentId });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>New folder</DialogTitle>
        <DialogDescription>Group related projects together.</DialogDescription>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Name</span>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Platform team"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
        </label>
        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" register="ui" disabled={!name.trim()} onClick={submit}>
            Create folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
