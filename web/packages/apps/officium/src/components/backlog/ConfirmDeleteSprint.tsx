"use client";

import { ArrowRightLeft } from "lucide-react";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@javadaba/ui";

import type { Sprint } from "../../lib/backlog/types";

export function ConfirmDeleteSprint({ sprint, onClose, onConfirm }: { sprint: Sprint; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Delete {sprint.name}?</DialogTitle>
        <DialogDescription>Its cards go back to the backlog. This can&apos;t be undone.</DialogDescription>
        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" register="ui" variant="outline" onClick={onConfirm}>
            <ArrowRightLeft size={14} /> Delete, move cards to backlog
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
