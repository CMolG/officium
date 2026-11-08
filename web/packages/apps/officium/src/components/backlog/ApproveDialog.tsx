"use client";

import { useId, useState } from "react";
import { BadgeCheck } from "lucide-react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Label, Radio, Text, Textarea } from "@javadaba/ui";

import { DIMENSION_LABEL, scoredDimensions, type QualityScore } from "../../lib/backlog/quality-lineage";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { isConflict } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import type { SendBackDialogProps } from "./SendBackDialog";

const OBSERVATIONS_MAX = 4000;
const SCORES: { id: QualityScore; label: string }[] = [
  { id: "clean", label: "Clean" },
  { id: "minor_observations", label: "Minor observations" },
];

/**
 * Approving a card out of review (card://JAVA-1526): the reviewer scores what they checked, one verdict per
 * engineering dimension (its finish only on a card that touches the UI), with optional observations. A person may
 * approve without the scorecard; an agent may not, the server says so. Nothing is preselected: a score is a claim
 * the reviewer makes, never a default they forgot to change.
 */
export function ApproveDialog({ projectId, repository, card, to, position, onSent, onClose }: SendBackDialogProps) {
  const dimensions = scoredDimensions(card.signals ?? []);
  const [scores, setScores] = useState<Record<string, QualityScore>>({});
  const [observations, setObservations] = useState("");
  const [version, setVersion] = useState(card.version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnFocus = useReturnFocus();
  const ids = { observations: useId(), missing: useId() };
  const unscored = dimensions.filter((d) => !scores[d]).map((d) => DIMENSION_LABEL[d]);
  const missing = unscored.length > 0 ? `Score ${unscored.join(", ")}.` : null;

  async function approve(withScorecard: boolean) {
    setBusy(true);
    setError(null);
    try {
      const qualityScorecard = withScorecard
        ? { ...scores, ...(observations.trim() ? { observations: observations.trim() } : {}) }
        : undefined;
      const result = await repository.moveCard(projectId, card.id, { expectedVersion: version, status: to, position, qualityScorecard });
      if (isConflict(result)) {
        setVersion(result.current.version);
        setError(`${result.message} Nothing was approved: look at what changed, then approve it again.`);
        return;
      }
      await onSent(result);
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't approve the card. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle className="flex flex-row items-center gap-2">
          <BadgeCheck size={18} aria-hidden="true" /> Approve {card.key} to {STATUS_CONFIG[to].label}
        </DialogTitle>
        <DialogDescription>
          Score what you checked. A dimension that fails is a send-back, not an approval.
        </DialogDescription>

        {dimensions.map((dimension) => (
          <fieldset key={dimension} data-dimension={dimension} className="flex flex-col gap-1">
            <legend className="text-sm font-semibold">{DIMENSION_LABEL[dimension]}</legend>
            <div className="flex flex-row flex-wrap gap-2">
              {SCORES.map((score) => (
                <div key={score.id} className="flex min-h-11 flex-col justify-center rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3">
                  <Radio name={`score-${dimension}`} value={score.id} checked={scores[dimension] === score.id}
                    onChange={() => setScores((current) => ({ ...current, [dimension]: score.id }))}>
                    {score.label}
                  </Radio>
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <div className="flex flex-col gap-1">
          <Label htmlFor={ids.observations}>Observations (optional)</Label>
          <Textarea id={ids.observations} value={observations} onChange={(e) => setObservations(e.target.value)}
            maxLength={OBSERVATIONS_MAX} rows={3} placeholder="What you noticed but did not send back." />
        </div>

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
          <Button type="button" register="ui" size="sm" variant="ghost" className="min-h-11 sm:min-h-0" disabled={busy}
            onClick={() => void approve(false)}>
            <Text>Approve without a scorecard</Text>
          </Button>
          <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" disabled={missing !== null || busy}
            aria-busy={busy || undefined} aria-describedby={missing ? ids.missing : undefined} onClick={() => void approve(true)}>
            <Text>{busy ? "Approving…" : "Approve"}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
