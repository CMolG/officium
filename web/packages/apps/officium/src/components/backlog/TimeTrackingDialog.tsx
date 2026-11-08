"use client";

import { useState } from "react";
import { Plus, Timer, Trash2 } from "lucide-react";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Progress, Text } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type Card, type CardDetail } from "../../lib/backlog/types";
import { formatDate, todayISO, totalHours, usageLine } from "../../lib/backlog/format";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import type { ConflictInfo } from "./ConflictDialog";

export interface TimeTrackingDialogProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  onClose: () => void;
  onChanged: (next: CardDetail) => void | Promise<void>;
  /** JDB-226: a 409 opens the shared `ConflictDialog` instead of a bare error string, same as
   *  every other write in `TaskModal`. */
  onConflict?: (info: ConflictInfo) => void;
}

/**
 * Time tracking, moved out of the card modal's body into its own Jira-style dialog (JAVA-198):
 * the sidebar's "Estimate / logged" readout is now the trigger. Logging time, deleting an entry
 * and the log-time form below are `TaskModal`'s own former `submitLog`/`removeTimeEntry`, moved
 * here unchanged; editing the estimate is new, going through the same `updateCard` +
 * version-conflict path every other field edit in the modal already uses.
 */
export function TimeTrackingDialog({ projectId, repository, detail, onClose, onChanged, onConflict }: TimeTrackingDialogProps) {
  const [logForm, setLogForm] = useState({ date: todayISO(), hours: "", who: detail.assignees[0]?.name ?? "You", note: "" });
  const [estimateDraft, setEstimateDraft] = useState(String(detail.estimate));
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnFocus = useReturnFocus();

  const logged = totalHours(detail.timeEntries);
  const sortedEntries = [...detail.timeEntries].sort((a, b) => (a.date < b.date ? -1 : 1));
  const estimateNumber = Number(estimateDraft.replace(",", "."));
  const remaining = detail.estimate - logged;

  /** Same shape as `TaskModal`'s own `reportConflict`: a 409 opens the shared dialog when the
   *  parent wired one, or falls back to the plain error banner. */
  function reportConflict(result: { error: "version_conflict"; message: string; current: Card }, retry: () => Promise<void>) {
    if (onConflict) onConflict({ message: result.message, current: result.current, onKeepMine: retry });
    else setError(result.message);
  }

  async function submitLog() {
    const hours = Number(logForm.hours.replace(",", "."));
    if (!logForm.date || !hours || hours <= 0) return;
    const result = await repository.logTime(projectId, detail.id, {
      expectedVersion: detail.version,
      date: logForm.date,
      hours,
      who: logForm.who.trim() || "Unassigned",
      note: logForm.note.trim(),
    });
    if (isConflict(result)) {
      reportConflict(result, submitLog);
      return;
    }
    setLogForm((f) => ({ ...f, hours: "", note: "" }));
    await onChanged(result);
  }

  async function removeTimeEntry(entryId: string) {
    const result = await repository.deleteTimeEntry(projectId, detail.id, entryId, detail.version);
    if (isConflict(result)) {
      reportConflict(result, () => removeTimeEntry(entryId));
      return;
    }
    await onChanged(result);
  }

  async function saveEstimate() {
    if (!Number.isFinite(estimateNumber) || estimateNumber < 0 || estimateNumber === detail.estimate || savingEstimate) return;
    setSavingEstimate(true);
    try {
      const result = await repository.updateCard(projectId, detail.id, { expectedVersion: detail.version, estimate: estimateNumber });
      if (isConflict(result)) {
        reportConflict(result, saveEstimate);
        return;
      }
      await onChanged({ ...detail, ...result });
    } finally {
      setSavingEstimate(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle className="flex flex-row items-center gap-2">
          <Timer size={18} aria-hidden="true" /> Time tracking
        </DialogTitle>
        <DialogDescription>Log time, delete an entry, or change the estimate for {detail.key}.</DialogDescription>

        {error && (
          <p role="alert" className="rounded-[var(--radius-jd-md)] border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Progress
            value={detail.estimate > 0 ? Math.min(logged, detail.estimate) : null}
            max={detail.estimate > 0 ? detail.estimate : 100}
            indicatorClassName={detail.estimate > 0 && logged > detail.estimate ? "bg-destructive" : undefined}
          />
          {/* The numbers in text too (interface-psychology.md #4: color is never the only
              channel), and the over-budget case says so in words, not just a red bar. */}
          <p className="text-sm font-medium text-[color:var(--jd-muted)]">
            {detail.estimate === 0 ? (
              <>No estimate · {logged.toFixed(2)}h logged</>
            ) : logged > detail.estimate ? (
              <>{logged.toFixed(2)}h logged · over by {(logged - detail.estimate).toFixed(2)}h</>
            ) : (
              <>{logged.toFixed(2)}h logged · {remaining.toFixed(2)}h remaining</>
            )}
          </p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Estimate (hours)</span>
          <div className="flex flex-row items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.25"
              value={estimateDraft}
              onChange={(e) => setEstimateDraft(e.target.value)}
              className="h-11 w-24 text-base sm:h-9 md:text-sm"
              aria-label="Estimate, in hours"
            />
            <Button
              type="button"
              register="ui"
              size="sm"
              variant="outline"
              disabled={savingEstimate || !Number.isFinite(estimateNumber) || estimateNumber < 0 || estimateNumber === detail.estimate}
              onClick={() => void saveEstimate()}
            >
              {savingEstimate ? "Saving…" : "Update estimate"}
            </Button>
          </div>
        </label>

        {/* One field per line on a phone (JAVA-59: four fields in a row left the note a sliver),
            a single row from `sm` up. */}
        <div className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-3 sm:flex-row sm:items-end sm:gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Date</span>
            <Input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} className="h-11 text-base sm:h-9 md:text-xs" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Hours</span>
            <Input type="number" min="0" step="0.25" value={logForm.hours} onChange={(e) => setLogForm({ ...logForm, hours: e.target.value })} placeholder="2.5" className="h-11 text-base sm:h-9 sm:w-20 md:text-xs" />
          </label>
          <label className="flex min-w-0 flex-col gap-1 sm:flex-1">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Work done</span>
            <Input
              value={logForm.note}
              onChange={(e) => setLogForm({ ...logForm, note: e.target.value })}
              placeholder="What did you do…"
              className="h-11 text-base sm:h-9 md:text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitLog();
              }}
            />
          </label>
          <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" onClick={() => void submitLog()}>
            <Plus size={14} /> Log
          </Button>
        </div>

        {sortedEntries.length === 0 ? (
          <p className="text-sm font-medium italic text-[color:var(--jd-muted)]">No hours logged yet.</p>
        ) : (
          // min-w-0: a truncated note still reports its whole width as the dialog grid's minimum,
          // which pushed the entries (and the log form) past the dialog's edge.
          <ul className="flex min-w-0 flex-col gap-2">
            {sortedEntries.map((entry) => (
              <li key={entry.id} className="flex flex-row items-center gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] py-1 pl-3 pr-1">
                {/* On a phone the note gets a line of its own under date · hours · who; on one row
                    it was left a few characters wide. An agent's entry adds what it went to and
                    spent on a line below (JAVA-245). */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-1">
                  <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-3">
                    <span className="flex flex-row min-w-0 items-center gap-3">
                      <span className="shrink-0 text-xs font-bold uppercase sm:w-24">{formatDate(entry.date)}</span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums sm:w-14">{entry.hours.toFixed(2)}h</span>
                      <span className="min-w-0 truncate text-xs font-medium text-[color:var(--jd-muted)] sm:w-24 sm:shrink-0">{entry.who}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{entry.note || "—"}</span>
                  </div>
                  {entry.source !== "manual" ? (
                    <Text className="min-w-0 text-xs text-[color:var(--jd-muted)]">{usageLine(entry)}</Text>
                  ) : null}
                </div>
                <Button
                  type="button"
                  register="ui"
                  size="icon"
                  variant="ghost"
                  onClick={() => void removeTimeEntry(entry.id)}
                  className="size-11 shrink-0 text-[color:var(--jd-muted)] hover:text-destructive"
                  aria-label="Delete time entry"
                >
                  <Trash2 size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" onClick={onClose}>
            <Text>Close</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
