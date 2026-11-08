"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Textarea } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";

export function CreateTeamDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { name: string; description?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const returnFocus = useReturnFocus();
  const canSubmit = name.trim().length > 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New team</DialogTitle>
          <DialogDescription>Grant its members editor or viewer access to any of your projects.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name">Name</Label>
            <Input id="team-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-description" optional>
              Description
            </Label>
            <Textarea id="team-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" register="ui" disabled={!canSubmit} onClick={() => void onCreate({ name: name.trim(), description: description.trim() || undefined })}>
            Create team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
