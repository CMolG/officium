"use client";

import { useState } from "react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Radio, Text } from "@javadaba/ui";

import { EFFORTS, MODEL_SUGGESTIONS, modelLabel } from "../../lib/backlog/role-matrix";
import type { Effort, RunCell } from "../../lib/backlog/role-matrix-types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { EFFORT_HINT } from "./RunConfigFields";

/**
 * A category cell's model and effort (JAVA-1776): two radio lists, the current one marked, Change disabled until
 * something differs. The roles a cell holds keep their own model and effort (`roles`), so they are carried through.
 */
export function RunPickerDialog({ title, run, onSave, onClose }: { title: string; run: RunCell; onSave: (run: RunCell) => void; onClose: () => void }) {
  const returnFocus = useReturnFocus();
  const [model, setModel] = useState(run.model);
  const [effort, setEffort] = useState<Effort>(run.effort);
  const models = MODEL_SUGGESTIONS.includes(run.model) ? MODEL_SUGGESTIONS : [run.model, ...MODEL_SUGGESTIONS];
  const changed = model !== run.model || effort !== run.effort;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg overflow-hidden">
        <DialogTitle>{`Model for ${title}`}</DialogTitle>
        <DialogDescription>An agent works this cell's cards with this model, unless a role has its own.</DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2">
              <Text className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Model</Text>
            </legend>
            {models.map((id) => (
              <div key={id} data-model={id} className="flex min-h-11 flex-col rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
                <Radio name="model" value={id} checked={model === id} onChange={() => setModel(id)}
                  description={<span className="font-mono">{id}</span>}>
                  {modelLabel(id)}
                </Radio>
              </div>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2">
              <Text className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Effort</Text>
            </legend>
            {EFFORTS.map((level) => (
              <div key={level} data-effort={level} className="flex min-h-11 flex-col rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
                <Radio name="effort" value={level} checked={effort === level} onChange={() => setEffort(level)} description={EFFORT_HINT[level]}>
                  {level}
                </Radio>
              </div>
            ))}
          </fieldset>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!changed && <Text className="text-xs text-[color:var(--jd-muted)] sm:mr-auto">Pick a model or an effort to change.</Text>}
          <DialogClose asChild>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0">
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" disabled={!changed} onClick={() => onSave({ ...run, model, effort })}>
            <Text>Change model</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
