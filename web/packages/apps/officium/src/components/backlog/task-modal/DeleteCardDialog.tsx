"use client";

import { useState } from "react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Text } from "@javadaba/ui";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import { isConflict, type CardDetail } from "../../../lib/backlog/types";
import { useReturnFocus } from "../../../lib/backlog/use-return-focus";
import type { ReportConflict } from "./types";

export interface DeleteCardDialogProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  /** Set when the card can be rejected instead: the choice the sheet puts beside Delete. */
  onRejectInstead?: () => void;
  onDeleted: () => void;
  onClose: () => void;
  reportConflict: ReportConflict;
}

/**
 * Deleting a card (Off-Card 2, "Delete a card"): irreversible, so it asks, says what goes with it, and offers
 * Reject instead, which keeps a record. A card someone else changed meanwhile is not deleted blind: the shared
 * conflict dialog shows what changed first.
 */
export function DeleteCardDialog({ projectId, repository, detail, onRejectInstead, onDeleted, onClose, reportConflict }: DeleteCardDialogProps) {
  const returnFocus = useReturnFocus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const result = await repository.deleteCard(projectId, detail.id, detail.version);
      if (result && isConflict(result)) {
        onClose();
        reportConflict(result, async () => undefined);
        return;
      }
      onDeleted();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't delete the card. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md" data-testid="delete-card-dialog">
        <DialogTitle>Delete {detail.key}?</DialogTitle>
        <DialogDescription>
          Its comments, time entries and links go with it. You can&apos;t undo this.
          {onRejectInstead ? " Rejecting keeps a record instead." : ""}
        </DialogDescription>
        {error && (
          <Text role="alert" className="block text-sm font-medium text-[color:var(--jd-bad)]">
            {error}
          </Text>
        )}
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <DialogClose asChild>
            <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11 sm:min-h-0" disabled={busy}>
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          {onRejectInstead && (
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={busy} onClick={onRejectInstead}>
              <Text>Reject instead</Text>
            </Button>
          )}
          <Button type="button" register="ui" size="sm" variant="destructive" className="min-h-11 sm:min-h-0" busy={busy} disabled={busy} onClick={() => void remove()}>
            <Text>Delete card</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
