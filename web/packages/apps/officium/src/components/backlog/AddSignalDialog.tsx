"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Radio, Text } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { RoleMatrix, Signal } from "../../lib/backlog/types";
import { PHASES } from "../../lib/backlog/role-matrix";
import { readRoleMatrix } from "../../lib/backlog/role-matrix-cache";
import { PHASE_LABEL, SIGNAL_HINT, SIGNAL_LABEL, SIGNAL_ORDER, roleLabel } from "../../lib/backlog/role-config";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";

export interface AddSignalDialogProps {
  projectId: string;
  repository: BacklogRepository;
  /** The signals the card already has: the picker offers the rest. */
  current: readonly Signal[];
  onClose: () => void;
  onAdd: (signal: Signal) => void;
}

/**
 * Adding a signal to a card (JAVA-521). A signal changes who may work the card, so it is chosen
 * here, with what it means and which roles it brings in this project, and confirmed -- never
 * switched on by a single tap in the sidebar. The roles come from the project's effective matrix,
 * the same one the server reads the card's `eligibleRoles` against.
 */
export function AddSignalDialog({ projectId, repository, current, onClose, onAdd }: AddSignalDialogProps) {
  const available = SIGNAL_ORDER.filter((signal) => !current.includes(signal));
  const [choice, setChoice] = useState<Signal | null>(null);
  const [matrix, setMatrix] = useState<RoleMatrix | null>(null);
  const [matrixFailed, setMatrixFailed] = useState(false);
  const returnFocus = useReturnFocus();

  useEffect(() => {
    let cancelled = false;
    readRoleMatrix(repository, projectId).then(
      (view) => {
        if (!cancelled) setMatrix(view.effective);
      },
      () => {
        if (!cancelled) setMatrixFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository]);

  function rolesLine(signal: Signal): string {
    if (!matrix) return matrixFailed ? "Couldn't load which roles it brings in." : "Loading which roles it brings in…";
    const row = matrix.signals[signal] ?? {};
    const phases = PHASES.filter((phase) => (row[phase]?.length ?? 0) > 0);
    if (phases.length === 0) return "Brings in no role in this project.";
    return `Brings in: ${phases.map((phase) => `${PHASE_LABEL[phase]}, ${row[phase]!.map(roleLabel).join(" and ")}`).join(" · ")}.`;
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle className="flex flex-row items-center gap-2">
          <Plus size={18} aria-hidden="true" /> Add a signal
        </DialogTitle>
        <DialogDescription>A signal says what the work touches, and brings in the roles that check it.</DialogDescription>

        <div role="radiogroup" aria-label="Signal to add" className="flex min-w-0 flex-col gap-2">
          {available.map((signal) => (
            <div
              key={signal}
              data-signal={signal}
              className="flex min-h-11 flex-col rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3"
            >
              <Radio
                name="signal"
                value={signal}
                checked={choice === signal}
                onChange={() => setChoice(signal)}
                description={
                  <>
                    {SIGNAL_HINT[signal]}
                    <br />
                    {rolesLine(signal)}
                  </>
                }
              >
                {SIGNAL_LABEL[signal]}
              </Radio>
            </div>
          ))}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {choice === null && (
            <Text className="text-xs text-[color:var(--jd-muted)] sm:mr-auto">Choose a signal to add.</Text>
          )}
          <DialogClose asChild>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0">
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button
            type="button"
            register="ui"
            size="sm"
            className="min-h-11 sm:min-h-0"
            disabled={choice === null}
            onClick={() => {
              if (choice) onAdd(choice);
            }}
          >
            <Text>Add signal</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
