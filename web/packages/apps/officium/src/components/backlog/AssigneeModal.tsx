"use client";

import { useState } from "react";
import { Plus, UserRound, X } from "lucide-react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Select } from "@javadaba/ui";

import type { Assignee } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { FIELD_SELECT } from "../../lib/field-select";

export interface AssigneeModalProps {
  current: Assignee[];
  /** Known assignees on the project (real accounts or names already used elsewhere), offered as
   *  a picker before falling back to free text -- officium-api.md: "a real account or a
   *  free-text name". */
  projectAssignees: Assignee[];
  onClose: () => void;
  onSave: (next: Assignee[]) => void;
}

/**
 * Manages who is assigned to a card. Adapted from
 * `../officium-concept/src/components/backlog/AssigneeModal.tsx`, which edited a rich profile
 * (role, email, availability) that has no home in the contract's `Assignee` shape
 * (`{accountId, name}` -- officium-api.md §2): that richer profile was UI-only invention in the
 * concept, with no backend behind it, so it is not carried over. What travels is the actual
 * capability the contract defines: assign a real project member, or a free-text name.
 */
export function AssigneeModal({ current, projectAssignees, onClose, onSave }: AssigneeModalProps) {
  const [selected, setSelected] = useState<Assignee[]>(current);
  const [pick, setPick] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const returnFocus = useReturnFocus();

  const available = projectAssignees.filter((a) => !selected.some((s) => s.name === a.name));

  function addPicked() {
    const found = available.find((a) => a.name === pick);
    if (!found) return;
    setSelected((prev) => [...prev, found]);
    setPick(null);
  }

  function addFreeText() {
    const name = freeText.trim();
    if (!name || selected.some((s) => s.name === name)) return;
    setSelected((prev) => [...prev, { accountId: null, name }]);
    setFreeText("");
  }

  function remove(name: string) {
    setSelected((prev) => prev.filter((s) => s.name !== name));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle>Manage assignees</DialogTitle>
        <DialogDescription>Add or remove who is assigned to this card.</DialogDescription>

        {/* Grows to the sheet's height on a phone, so the footer below lands at its bottom. */}
        <div className="flex min-w-0 flex-col gap-4 max-sm:flex-1">
          <div className="flex flex-col gap-2">
            {selected.length === 0 && <p className="text-sm text-[color:var(--jd-muted)]">Nobody assigned yet.</p>}
            {selected.map((a) => (
              <div key={a.name} className="flex flex-row items-center gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3 py-2">
                <UserRound size={16} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
                <button type="button" onClick={() => remove(a.name)} aria-label={`Remove ${a.name}`} className="-my-2 -mr-2 flex flex-row size-11 shrink-0 items-center justify-center rounded-[var(--radius-jd-sm)] hover:bg-[color:var(--jd-ink)]/[0.06]">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {available.length > 0 && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Select aria-label="Pick a project member" value={pick} onChange={setPick} placeholder="Project member…" options={available.map((a) => ({ value: a.name, label: a.name }))} className={`${FIELD_SELECT} min-w-0 sm:flex-1`} />
              <Button type="button" register="ui" size="sm" disabled={!pick} onClick={addPicked}>
                <Plus size={14} /> Add
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-[color:var(--jd-line)] pt-4 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-xs font-bold uppercase text-[color:var(--jd-muted)]">Or a free-text name</span>
              <Input
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="e.g. an external contractor"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFreeText();
                  }
                }}
              />
            </label>
            <Button type="button" register="ui" size="sm" variant="outline" disabled={!freeText.trim()} onClick={addFreeText}>
              <Plus size={14} /> Add
            </Button>
          </div>

          <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
            <DialogClose asChild>
              <Button type="button" register="ui" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" register="ui" onClick={() => onSave(selected)}>
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
