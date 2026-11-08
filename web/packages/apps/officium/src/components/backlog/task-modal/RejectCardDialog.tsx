"use client";

import { useId, useState } from "react";
import { Ban } from "lucide-react";

import {
  Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Label, Radio, Text, Textarea,
} from "@javadaba/ui";

import type { BacklogRepository } from "../../../lib/backlog/repository";
import { isConflict, type CardDetail, type RejectionReason, type RejectionReasonEntry } from "../../../lib/backlog/types";
import { REJECTION_NOTE_MAX } from "../../../lib/backlog/rejection";
import { useReturnFocus } from "../../../lib/backlog/use-return-focus";
import type { OnChanged } from "./types";

export interface RejectCardDialogProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  reasons: readonly RejectionReasonEntry[];
  onChanged: OnChanged;
  onClose: () => void;
}

/** "JAVA-1", "JAVA-1 and JAVA-2", "JAVA-1, JAVA-2 and JAVA-3". */
const keyList = (keys: readonly string[]) =>
  keys.length < 2 ? keys.join("") : `${keys.slice(0, -1).join(", ")} and ${keys[keys.length - 1]}`;

/**
 * Rejecting a card (card://JAVA-1415): why, from the closed list, what was wrong, and the card the
 * reason names. No confirmation step: rejecting is reversible (a rejected card reopens in Refine),
 * so the one deliberate step is this form, which carries the data the rejected cards are read for
 * (`interface-psychology.md`, the friction tree). A refusal shows here and keeps what was typed.
 */
export function RejectCardDialog({ projectId, repository, detail, reasons, onChanged, onClose }: RejectCardDialogProps) {
  const [reason, setReason] = useState<RejectionReason | null>(null);
  const [named, setNamed] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnFocus = useReturnFocus();
  const ids = { reasons: useId(), card: useId(), note: useId() };
  const entry = reasons.find((r) => r.id === reason) ?? null;

  function refusal(): string | null {
    if (!entry) return "Choose why the card is rejected.";
    if (!note.trim()) return "Say what was wrong: it is what a later reading of the rejected cards learns from.";
    if (entry.namesCard && !named.trim()) return `A ${entry.label.toLowerCase()} rejection names the card it points to: give its key.`;
    return null;
  }

  async function reject() {
    const refused = refusal();
    if (refused || !entry) {
      setError(refused);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await repository.moveCard(projectId, detail.id, {
        expectedVersion: detail.version,
        status: "rejected",
        position: 0,
        rejection: { reason: entry.id, note: note.trim(), ...(named.trim() ? { card: named.trim().toUpperCase() } : {}) },
      });
      if (isConflict(result)) {
        setError(`${result.message} Nothing was rejected: close this, look at what changed, then reject it again.`);
        return;
      }
      await onChanged({ ...detail, ...result });
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't reject the card. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle className="flex flex-row items-center gap-2">
          <Ban size={18} aria-hidden="true" /> Reject {detail.key}
        </DialogTitle>
        <DialogDescription>
          It leaves the board and is kept, with why, under View rejected. You can reopen it in Refine.
        </DialogDescription>

        <Text id={ids.reasons} className="text-sm font-semibold">Why is it rejected?</Text>
        <div role="radiogroup" aria-labelledby={ids.reasons} className="flex min-w-0 flex-col gap-2">
          {reasons.map((option) => (
            <div key={option.id} data-reason={option.id}
              className="flex min-h-11 flex-col rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
              <Radio name="rejection-reason" value={option.id} checked={reason === option.id}
                onChange={() => setReason(option.id)} description={option.hint}>
                {option.label}
              </Radio>
            </div>
          ))}
        </div>

        {entry && (
          <div className="flex flex-col gap-1">
            <Label htmlFor={ids.card}>Which card? {entry.namesCard ? "(required)" : "(optional)"}</Label>
            <Input id={ids.card} value={named} onChange={(e) => setNamed(e.target.value)} placeholder="OFF-12"
              aria-required={entry.namesCard || undefined} autoComplete="off" />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor={ids.note}>What was wrong</Label>
          <Textarea id={ids.note} value={note} onChange={(e) => setNote(e.target.value)} maxLength={REJECTION_NOTE_MAX}
            rows={4} aria-required="true" />
          <Text className="self-end text-xs text-[color:var(--jd-muted)]">
            {note.length.toLocaleString("en-US")} / {REJECTION_NOTE_MAX.toLocaleString("en-US")}
          </Text>
        </div>

        {detail.blocks.length > 0 && (
          <Text data-testid="reject-still-blocks" className="text-sm">
            {keyList(detail.blocks)} {detail.blocks.length === 1 ? "stays" : "stay"} blocked until you re-point or remove
            {detail.blocks.length === 1 ? " that link" : " those links"}.
          </Text>
        )}

        {error && (
          <Text role="alert" className="block rounded-[var(--radius-jd-md)] bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </Text>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!entry && <Text className="text-xs text-[color:var(--jd-muted)] sm:mr-auto">Choose why it is rejected.</Text>}
          <DialogClose asChild>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={busy}>
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button type="button" register="ui" size="sm" variant="destructive" className="min-h-11 sm:min-h-0"
            disabled={!entry || busy} aria-busy={busy || undefined} onClick={() => void reject()}>
            <Text>{busy ? "Rejecting…" : "Reject card"}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
