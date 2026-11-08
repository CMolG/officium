"use client";

import { useState } from "react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Text } from "@javadaba/ui";

import { sameMods } from "../../lib/backlog/role-matrix";
import { useModCatalog } from "../../lib/backlog/use-mods";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { CellModsPicker } from "./CellModsPicker";

/**
 * A cell's mods in a dialog (JAVA-1776): the same picker the cell's editor showed, over a local copy, so Cancel changes
 * nothing. Save hands the list to the page's draft.
 */
export function CellModsDialog({
  title,
  mods,
  roles,
  projectId,
  onSave,
  onClose,
}: {
  title: string;
  mods: string[];
  roles: string[];
  /** The project the mod catalog is read through; left out, the person's last one. */
  projectId?: string;
  onSave: (mods: string[]) => void;
  onClose: () => void;
}) {
  const returnFocus = useReturnFocus();
  const catalog = useModCatalog(projectId);
  const [draft, setDraft] = useState(mods);
  const changed = !sameMods(draft, mods);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg overflow-hidden">
        <DialogTitle>{`Mods for ${title}`}</DialogTitle>
        <DialogDescription>The mods this cell's roles follow. The ones its roles require stay on.</DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <CellModsPicker mods={draft} roles={roles} catalog={catalog} onChange={setDraft} />
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {!changed && <Text className="text-xs text-[color:var(--jd-muted)] sm:mr-auto">Add or remove a mod to save.</Text>}
          <DialogClose asChild>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0">
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" disabled={!changed} onClick={() => onSave(draft)}>
            <Text>Save mods</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
