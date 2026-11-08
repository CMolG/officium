"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";

/**
 * Deleting a trashed page for good (JAVA-793). It cannot be put back, so it asks for the page's
 * title to be typed, and says why the button is disabled until it is (interface-psychology #2).
 */
export function PurgeDialog({ title, onClose, onConfirm }: { title: string; onClose: () => void; onConfirm: () => Promise<string | null> }) {
  const returnFocus = useReturnFocus();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = typed.trim() === title;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-sm">
        <DialogTitle>Delete “{title}” forever?</DialogTitle>
        <DialogDescription>
          The page is removed for everyone in the project, agents included, and can&apos;t be restored. It would leave the
          trash by itself 30 days after it was deleted.
        </DialogDescription>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!matches || busy) return;
            setBusy(true);
            const problem = await onConfirm();
            setBusy(false);
            if (problem) setError(problem);
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Type the page&apos;s title to confirm</span>
            <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={title} aria-describedby="purge-help" />
          </label>
          <span id="purge-help" className="text-xs text-[color:var(--jd-muted)]">
            {matches ? "Ready: this is the page you are deleting." : "The button stays disabled until the title above matches."}
          </span>
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
            <Button type="button" register="ui" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" register="ui" variant="destructive" disabled={!matches || busy}>
              {busy ? "Deleting…" : "Delete forever"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
