"use client";

import { useState } from "react";
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import type { ChangelogEntry, DocPageSummary } from "../../lib/backlog/types";

/**
 * Names the pages a change updated (JAVA-132). Only pages that exist can be named -- the API
 * refuses anything else (`unknown_doc_page`) -- so they are picked from the project's list rather
 * than typed.
 */
export function MarkUpdatedDialog({
  entry,
  pages,
  onClose,
  onSubmit,
}: {
  entry: ChangelogEntry;
  pages: DocPageSummary[];
  onClose: () => void;
  /** Resolves to an error to show, or `null` once marked. */
  onSubmit: (pages: string[]) => Promise<string | null>;
}) {
  const returnFocus = useReturnFocus();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(path: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function submit() {
    if (chosen.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    const problem = await onSubmit([...chosen]);
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md">
        <DialogTitle>Which pages were updated?</DialogTitle>
        <DialogDescription>{`For "${entry.title}".`}</DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {pages.length === 0 ? (
            <p className="text-sm text-[color:var(--jd-muted)]">
              This project has no pages yet. Write the page first, then come back and name it here.
            </p>
          ) : (
            <fieldset className="flex max-h-72 min-w-0 flex-col gap-1 overflow-y-auto">
              <legend className="sr-only">
                <span>Pages</span>
              </legend>
              {pages.map((page) => (
                <div
                  key={page.path}
                  className="flex min-h-11 flex-col justify-center gap-0.5 rounded-[var(--radius-jd-sm)] px-2 hover:bg-[color:var(--jd-ink)]/[0.06]"
                >
                  <Checkbox checked={chosen.has(page.path)} onChange={() => toggle(page.path)}>
                    <span className="truncate text-sm">{page.title}</span>
                  </Checkbox>
                  <span className="truncate pl-[34px] font-mono text-xs text-[color:var(--jd-muted)]">{page.path}</span>
                </div>
              ))}
            </fieldset>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
            <Button type="button" register="ui" variant="ghost" onClick={onClose}>
              <span>Cancel</span>
            </Button>
            <Button type="submit" register="ui" disabled={chosen.size === 0 || busy}>
              <span>{busy ? "Saving…" : chosen.size === 0 ? "Pick at least one page" : "Mark as updated"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
