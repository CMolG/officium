"use client";

import { useState, type ReactNode } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle, Input } from "@javadaba/ui";

import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { BUILTIN_PATH_PROBLEM, DOC_PATH_HINT, isBuiltinDocPath, normalizeDocPath, slugFromTitle } from "../../lib/docs/doc-path";

/**
 * A page's title and path, for creating one and for renaming one. The path follows the title
 * while nobody has typed into it (creating), and says what is wrong with it before anything is
 * sent: an invalid path, one another page already holds, or one under Officium's own pages. A
 * `suggestedTitle` (a template's, filled, JAVA-801) shows until the person types a title of their own.
 */
export function PageFormDialog({
  heading,
  description,
  submitLabel,
  initialTitle = "",
  initialPath = "",
  pathPrefix = "",
  suggestedTitle,
  takenPaths,
  extra,
  onClose,
  onSubmit,
}: {
  heading: string;
  description: string;
  submitLabel: string;
  initialTitle?: string;
  initialPath?: string;
  /** Where an untouched path starts: the section a page is added inside (`guides/`). */
  pathPrefix?: string;
  suggestedTitle?: string;
  /** Paths other pages hold -- never the page being renamed. */
  takenPaths: ReadonlySet<string>;
  /** More fields, after the path: where a template goes, what a page starts from (JAVA-801). */
  extra?: ReactNode | ((state: { title: string }) => ReactNode);
  onClose: () => void;
  /** Resolves to an error to show, or `null` once done. */
  onSubmit: (input: { title: string; path: string }) => Promise<string | null>;
}) {
  const returnFocus = useReturnFocus();
  const [typedTitle, setTitle] = useState(initialTitle);
  const [titleTouched, setTitleTouched] = useState(false);
  const title = titleTouched || suggestedTitle === undefined ? typedTitle : suggestedTitle;
  const [path, setPath] = useState(initialPath);
  const [pathTouched, setPathTouched] = useState(initialPath !== "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shownPath = pathTouched ? path : `${pathPrefix}${slugFromTitle(title)}`;
  const normalized = normalizeDocPath(shownPath);
  const pathProblem = !shownPath.trim()
    ? null
    : !normalized
      ? DOC_PATH_HINT
      : isBuiltinDocPath(normalized)
        ? BUILTIN_PATH_PROBLEM
        : takenPaths.has(normalized)
          ? "Another page already lives at this path."
          : null;
  const ready = Boolean(title.trim() && normalized && !pathProblem && !busy);

  async function submit() {
    if (!ready || !normalized) return;
    setBusy(true);
    setError(null);
    const problem = await onSubmit({ title: title.trim(), path: normalized });
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md">
        <DialogTitle>{heading}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Title</span>
            <Input
              autoFocus
              value={title}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
              placeholder="e.g. Deploy to production"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Path</span>
            <Input
              value={shownPath}
              onChange={(e) => {
                setPathTouched(true);
                setPath(e.target.value);
              }}
              placeholder="procedures/deploy"
              aria-invalid={pathProblem ? true : undefined}
              aria-describedby="doc-path-help"
              className="font-mono"
            />
            <span id="doc-path-help" className={`text-xs ${pathProblem ? "text-destructive" : "text-[color:var(--jd-muted)]"}`}>
              {pathProblem ?? "Where the page sits in the tree. Use / to put it under a section."}
            </span>
          </label>
          {typeof extra === "function" ? extra({ title }) : extra}
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
              {busy ? "Saving…" : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
