"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { BUILTIN_PATH_PROBLEM, DOC_PATH_HINT, isBuiltinDocPath, normalizeDocPath, slugFromTitle } from "../../lib/docs/doc-path";

/** A new collection (JAVA-791): a depth-1 node, named by its path. It can be deleted again while empty. */
export function NewCollectionDialog({
  takenPaths,
  onClose,
  onSubmit,
}: {
  /** The depth-1 paths that already exist. */
  takenPaths: ReadonlySet<string>;
  onClose: () => void;
  /** Resolves to an error to show, or `null` once done. */
  onSubmit: (path: string) => Promise<string | null>;
}) {
  const returnFocus = useReturnFocus();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const path = normalizeDocPath(slugFromTitle(name));
  const problem = !name.trim()
    ? null
    : !path
      ? DOC_PATH_HINT
      : isBuiltinDocPath(path)
        ? BUILTIN_PATH_PROBLEM
        : takenPaths.has(path)
          ? "A collection with this name already exists."
          : null;
  const ready = Boolean(path && !problem && !busy);

  async function submit() {
    if (!ready || !path) return;
    setBusy(true);
    setError(null);
    const failure = await onSubmit(path);
    setBusy(false);
    if (failure) setError(failure);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md">
        <DialogTitle>New collection</DialogTitle>
        <DialogDescription>A section of the documentation. Pages go inside it.</DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Name</span>
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Procedures" aria-invalid={problem ? true : undefined} />
            <span className={`text-xs ${problem ? "text-destructive" : "text-[color:var(--jd-muted)]"}`}>
              {problem ?? (path ? `Its path is ${path}/.` : "Letters, digits and hyphens make its path.")}
            </span>
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
            <Button type="button" register="ui" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" register="ui" disabled={!ready}>
              {busy ? "Creating…" : "Create collection"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
