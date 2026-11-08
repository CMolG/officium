"use client";

import { useId, useState } from "react";
import { Undo2 } from "lucide-react";

import { Button, Checkbox, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Label, Text, Textarea } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { REVIEW_RETURN_FINDINGS_MAX, REVIEW_RETURN_REASONS } from "../../lib/backlog/review-returns";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { isConflict, type Card, type ReviewReturnReason, type Status } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { RuleViolationsPicker } from "./RuleViolationsPicker";

/** The card being sent back: what the move needs from it. */
export type SendBackTarget = Pick<Card, "id" | "key" | "version" | "status"> & { signals?: Card["signals"]; category?: Card["category"] };

export interface SendBackDialogProps {
  projectId: string;
  repository: BacklogRepository;
  card: SendBackTarget;
  /** Where it goes: refine, to do, doing or ready. */
  to: Status;
  position: number;
  /** The card as the move answers it. */
  onSent: (card: Card) => void | Promise<void>;
  onClose: () => void;
}

/**
 * Sending a card back from review or deploy (card://JAVA-1416): why, from the closed list, and what was wrong.
 * No confirmation step: a send-back is reversible (the card is moved on again), so the one deliberate step is
 * this form, which carries the data the reviews are read for (`interface-psychology.md`, the friction tree).
 * Nothing is preselected, Cancel leaves the card where it was, and a refusal shows here and keeps what was typed.
 */
export function SendBackDialog({ projectId, repository, card, to, position, onSent, onClose }: SendBackDialogProps) {
  const [reasons, setReasons] = useState<ReviewReturnReason[]>([]);
  const [findings, setFindings] = useState("");
  const [violations, setViolations] = useState<string[]>([]);
  const [version, setVersion] = useState(card.version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnFocus = useReturnFocus();
  const ids = { reasons: useId(), findings: useId(), missing: useId() };

  const missing = reasons.length === 0 ? "Choose at least one reason." : !findings.trim() ? "Say what was wrong." : null;

  function toggle(id: ReviewReturnReason) {
    setReasons((current) => (current.includes(id) ? current.filter((r) => r !== id) : [...current, id]));
  }

  async function send() {
    if (missing) return;
    setBusy(true);
    setError(null);
    try {
      const result = await repository.moveCard(projectId, card.id, {
        expectedVersion: version,
        status: to,
        position,
        reviewReturn: { reasons, findings: findings.trim(), ...(violations.length > 0 ? { ruleViolations: violations } : {}) },
      });
      if (isConflict(result)) {
        setVersion(result.current.version);
        setError(`${result.message} Nothing was sent back: look at what changed, then send it back again.`);
        return;
      }
      await onSent(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't send the card back. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle className="flex flex-row items-center gap-2">
          <Undo2 size={18} aria-hidden="true" /> Send {card.key} back to {STATUS_CONFIG[to].label}
        </DialogTitle>
        <DialogDescription>
          It leaves {STATUS_CONFIG[card.status].label}. Your findings become a comment on the card, and the send-back is kept in its log.
        </DialogDescription>

        <Text id={ids.reasons} className="text-sm font-semibold">Why is it sent back? Choose every reason that applies.</Text>
        <div role="group" aria-labelledby={ids.reasons} className="flex min-w-0 flex-col gap-2">
          {REVIEW_RETURN_REASONS.map((option) => (
            <div key={option.id} data-reason={option.id}
              className="flex min-h-11 flex-col gap-1 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
              <Checkbox name="send-back-reason" value={option.id} checked={reasons.includes(option.id)} onChange={() => toggle(option.id)}>
                <span className="font-semibold">{option.label}</span>
              </Checkbox>
              <Text className="pl-[34px] text-xs text-[color:var(--jd-muted)]">{option.hint}</Text>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={ids.findings}>Findings</Label>
          <Textarea id={ids.findings} value={findings} onChange={(e) => setFindings(e.target.value)}
            maxLength={REVIEW_RETURN_FINDINGS_MAX} rows={5} aria-required="true"
            placeholder="What is wrong, and what the author should do about it." />
          <Text className="self-end text-xs text-[color:var(--jd-muted)]">
            {findings.length.toLocaleString("en-US")} / {REVIEW_RETURN_FINDINGS_MAX.toLocaleString("en-US")}
          </Text>
        </div>

        <RuleViolationsPicker value={violations} onChange={setViolations} />

        {error && (
          <Text role="alert" className="block rounded-[var(--radius-jd-md)] bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </Text>
        )}

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {missing && <Text id={ids.missing} className="text-xs text-[color:var(--jd-muted)] sm:mr-auto">{missing}</Text>}
          <DialogClose asChild>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={busy}>
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" disabled={missing !== null || busy}
            aria-busy={busy || undefined} aria-describedby={missing ? ids.missing : undefined} onClick={() => void send()}>
            <Text>{busy ? "Sending back…" : "Send back"}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
