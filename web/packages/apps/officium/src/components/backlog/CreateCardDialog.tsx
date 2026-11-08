"use client";

import { useState } from "react";
import { Bot, UserRound } from "lucide-react";

import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input, Select, ToggleGroup, ToggleGroupItem } from "@javadaba/ui";
import { MarkdownEditor } from "@javadaba/rich-text";

import type { Assignee, Category, Executor, Priority, SpikeSubtype, Status } from "../../lib/backlog/types";
import { PRIORITY_CONFIG, STATUS_CONFIG, STATUS_ORDER } from "../../lib/backlog/status-config";
import { NO_CATEGORY, categoryOptions } from "../../lib/backlog/category-config";
import { SPIKE_SUBTYPE_CONFIG, SPIKE_SUBTYPE_ORDER } from "../../lib/backlog/role-config";
import { CategoryGuideNote } from "./CategoryGuideNote";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { FIELD_SELECT } from "../../lib/field-select";

/** The four blocks `cards.requestHuman` writes, as the headings it writes them with. */
const HUMAN_TEMPLATE = "## Why this needs you\n\n\n## Steps\n1. \n\n## Done when\n\n\n## Unblocks\n";

export interface CreateCardInput {
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  executor: Executor;
  category: Category | null;
  /** Only while the category is spike (JAVA-391). */
  subtype: SpikeSubtype | null;
  assignee: Assignee | null;
}

/**
 * "New card" (JDB-225: the concept had none, but a real backlog does). Minimal and consistent
 * with `TaskModal` -- same status/priority selects, same executor language as JDB-239's toggle
 * on the modal's sidebar. Switching to `human` pre-fills the four-block template (Why this needs
 * you · Steps · Done when · Unblocks) and requires an assignee, matching the contract's own
 * `human_card_not_runnable` rule (a human card always has one).
 */
export function CreateCardDialog({
  defaultStatus,
  projectAssignees,
  onClose,
  onCreate,
}: {
  defaultStatus: Status;
  projectAssignees: Assignee[];
  onClose: () => void;
  onCreate: (input: CreateCardInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>(defaultStatus);
  const [priority, setPriority] = useState<Priority>("medium");
  const [category, setCategory] = useState<Category | null>(null);
  const [subtype, setSubtype] = useState<SpikeSubtype>("technical");
  const [executor, setExecutor] = useState<Executor>("ai");
  const [assigneeName, setAssigneeName] = useState<string | null>(null);
  // The editor reads its text once: filling in the template means a fresh editor.
  const [editorKey, setEditorKey] = useState(0);
  const returnFocus = useReturnFocus();

  function toggleExecutor(next: Executor) {
    setExecutor(next);
    if (next === "human" && description.trim() === "") {
      setDescription(HUMAN_TEMPLATE);
      setEditorKey((k) => k + 1);
    }
  }

  const assignee = projectAssignees.find((a) => a.name === assigneeName) ?? null;
  const missing = !title.trim() ? "Add a title to create the card." : executor === "human" && !assignee ? "Pick who does it." : null;
  const canSubmit = missing === null;

  function submit() {
    if (!canSubmit) return;
    onCreate({
      title: title.trim(),
      description,
      status,
      priority,
      executor,
      category,
      subtype: category === "spike" ? subtype : null,
      assignee,
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle>New card</DialogTitle>
        <DialogDescription>Add a card to this project's backlog.</DialogDescription>

        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Title</span>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
          </label>

          {/* A column on a phone, three even columns from `sm` up: wrapped, the third select
              dropped to a line of its own at a different width (JAVA-59). */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Status</span>
              <Select aria-label="Status" value={status} onChange={(v) => setStatus(v as Status)} options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_CONFIG[s].label }))} className={FIELD_SELECT} />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Priority</span>
              <Select
                aria-label="Priority"
                value={priority}
                onChange={(v) => setPriority(v as Priority)}
                options={Object.values(PRIORITY_CONFIG).map((p) => ({ value: p.id, label: p.label }))}
                className={FIELD_SELECT}
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Category</span>
              <Select
                aria-label="Category"
                value={category}
                placeholder="No category"
                onChange={(v) => setCategory(v === NO_CATEGORY ? null : (v as Category))}
                options={[{ value: NO_CATEGORY, label: "No category" }, ...categoryOptions()]}
                menuWidth={220}
                className={FIELD_SELECT}
              />
            </label>
          </div>
          <CategoryGuideNote category={category} />
          {category === "spike" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Subtype</span>
              <Select
                aria-label="Subtype"
                value={subtype}
                onChange={(v) => setSubtype(v as SpikeSubtype)}
                options={SPIKE_SUBTYPE_ORDER.map((s) => ({ value: s, label: SPIKE_SUBTYPE_CONFIG[s].label, description: SPIKE_SUBTYPE_CONFIG[s].hint }))}
                menuWidth={260}
                className={FIELD_SELECT}
              />
            </label>
          )}

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase text-[color:var(--jd-muted)]">Who executes it</span>
            <ToggleGroup type="single" value={executor} onValueChange={(v) => v && toggleExecutor(v as Executor)} aria-label="Executor" className="justify-start gap-1.5">
              <ToggleGroupItem value="ai" variant="outline" size="sm" aria-label="AI agent">
                <Bot size={14} /> AI agent
              </ToggleGroupItem>
              <ToggleGroupItem value="human" variant="outline" size="sm" aria-label="A person">
                <UserRound size={14} /> A person
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {executor === "human" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Assignee (required)</span>
              <Select
                aria-label="Assignee"
                value={assigneeName}
                onChange={setAssigneeName}
                placeholder="Pick a person…"
                options={projectAssignees.map((a) => ({ value: a.name, label: a.name }))}
                className={FIELD_SELECT}
              />
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Description</span>
            <MarkdownEditor
              key={editorKey}
              value={description}
              onChange={({ markdown }) => setDescription(markdown)}
              onSubmit={submit}
              label="Description"
              placeholder="Optional: what is this card about?"
              controls="compact"
              contentClassName="min-h-28"
            />
          </div>
        </div>

        {/* A disabled button says why (psicologia #2) -- right above the actions, not among
            them; the pair sits at the bottom of the sheet on a phone. */}
        <div className="flex flex-col gap-3 max-sm:mt-auto">
          {missing && <p className="text-xs text-[color:var(--jd-muted)]">{missing}</p>}
          <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
            <Button type="button" register="ui" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" register="ui" disabled={!canSubmit} onClick={submit}>
              Create card
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
