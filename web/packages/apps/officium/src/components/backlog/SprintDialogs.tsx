"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Select, Textarea } from "@javadaba/ui";

import type { BoardCard } from "../../lib/backlog/board-copy";
import type { Sprint } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { FIELD_SELECT } from "../../lib/field-select";

/** Create / edit / start / complete a sprint (JAVA-54, officium-api.md §8.2). One file: the four
 *  dialogs share the same shape (name+goal+dates, or a confirmation) and nobody else opens them. */

export function CreateSprintDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (input: { name?: string; goal?: string; startDate?: string; endDate?: string }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const returnFocus = useReturnFocus();

  async function submit() {
    setSaving(true);
    try {
      await onCreate({ name: name.trim() || undefined, goal: goal.trim() || undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>New sprint</DialogTitle>
        <DialogDescription>It starts planned; nothing moves until you start it.</DialogDescription>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Name</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Defaults to “Sprint N”" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Goal</span>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Optional" rows={2} />
          </label>
        </div>
        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" register="ui" disabled={saving} onClick={() => void submit()}>
            {saving ? "Creating…" : "Create sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditSprintDialog({
  sprint,
  onClose,
  onSave,
}: {
  sprint: Sprint;
  onClose: () => void;
  onSave: (input: { name: string; goal: string; startDate: string | null; endDate: string | null }) => Promise<boolean>;
}) {
  const [name, setName] = useState(sprint.name);
  const [goal, setGoal] = useState(sprint.goal);
  const [startDate, setStartDate] = useState(sprint.startDate ?? "");
  const [endDate, setEndDate] = useState(sprint.endDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const returnFocus = useReturnFocus();

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const ok = await onSave({ name: name.trim() || sprint.name, goal, startDate: startDate || null, endDate: endDate || null });
      if (ok) onClose();
      else setError("This sprint changed elsewhere since you opened it. Reopen it and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>Edit sprint</DialogTitle>
        <DialogDescription>{sprint.name}</DialogDescription>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Name</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Goal</span>
            <Textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Start</span>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">End</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
          </div>
          {error && <p role="alert" className="text-xs font-bold text-destructive">{error}</p>}
        </div>
        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" register="ui" disabled={saving} onClick={() => void submit()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StartSprintDialog({
  sprint,
  disabledReason,
  onClose,
  onStart,
}: {
  sprint: Sprint;
  /** Another sprint is already active: shown, disabled, WITH the reason (`interface-psychology.md` #2). */
  disabledReason: string | null;
  onClose: () => void;
  onStart: (input: { startDate?: string; endDate?: string }) => Promise<void>;
}) {
  const [startDate, setStartDate] = useState(sprint.startDate ?? "");
  const [endDate, setEndDate] = useState(sprint.endDate ?? "");
  const [saving, setSaving] = useState(false);
  const returnFocus = useReturnFocus();

  async function submit() {
    setSaving(true);
    try {
      await onStart({ startDate: startDate || undefined, endDate: endDate || undefined });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>Start {sprint.name}?</DialogTitle>
        <DialogDescription>The board will show only this sprint's cards while it's active.</DialogDescription>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Start</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">End</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        {disabledReason && <p className="text-xs font-medium text-[color:var(--jd-muted)]">{disabledReason}</p>}
        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" register="ui" disabled={saving || Boolean(disabledReason)} title={disabledReason ?? undefined} onClick={() => void submit()}>
            {saving ? "Starting…" : "Start sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CompleteSprintDialog({
  sprint,
  openCards,
  otherSprints,
  onClose,
  onComplete,
}: {
  sprint: Sprint;
  openCards: BoardCard[];
  otherSprints: Sprint[];
  onClose: () => void;
  onComplete: (moveOpenCardsTo: string) => Promise<void>;
}) {
  const [target, setTarget] = useState("backlog");
  const [saving, setSaving] = useState(false);
  const returnFocus = useReturnFocus();

  async function submit() {
    setSaving(true);
    try {
      await onComplete(target);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>Complete {sprint.name}?</DialogTitle>
        <DialogDescription>
          {openCards.length === 0
            ? "Every card in this sprint is finished."
            : `${openCards.length} unfinished ${openCards.length === 1 ? "card" : "cards"} need somewhere to go.`}
        </DialogDescription>

        {openCards.length > 0 && (
          <>
            <ul className="max-h-32 overflow-y-auto rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-2 text-sm">
              {openCards.map((c) => (
                <li key={c.id} className="truncate py-0.5">
                  <span className="font-mono text-xs text-[color:var(--jd-muted)]">{c.key}</span> {c.title}
                </li>
              ))}
            </ul>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Move them to</span>
              <Select
                aria-label="Move unfinished cards to"
                value={target}
                onChange={setTarget}
                options={[{ value: "backlog", label: "Backlog" }, ...otherSprints.map((s) => ({ value: s.id, label: s.name }))]}
                className={FIELD_SELECT}
              />
            </label>
          </>
        )}

        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" register="ui" disabled={saving} onClick={() => void submit()}>
            {saving ? "Completing…" : "Complete sprint"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
