"use client";

import { useMemo, useState } from "react";
import { Button, Text, ToggleGroup, ToggleGroupItem } from "@javadaba/ui";

import type { DocThread } from "../../../lib/backlog/types";
import { DocCommentComposer } from "./DocCommentComposer";
import { DocThreadCard } from "./DocThreadCard";
import type { Commenting } from "./use-commenting";

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "resolved", label: "Resolved" },
] as const;

/**
 * A page's comments at its end (JAVA-1538), beside the pages under it and what references it: the general comments --
 * page-level threads and those whose words left the page -- with the composer, behind an Open / Resolved filter with
 * counts. The threads about a passage live on the passage (its popover); they are listed here too, folded, so the
 * keyboard and a reader who wants them all can reach them.
 */
export function DocCommentsSection({ projectId, commenting, anchored }: {
  projectId: string;
  commenting: Commenting;
  /** Thread ids the page found its words for, in page order; `null` until the page has looked. */
  anchored: readonly string[] | null;
}) {
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const { comments, me, canWrite, owner } = commenting;
  const { threads, status, error, reload, actions } = comments;
  const counts = { open: threads.filter((t) => !t.resolvedAt).length, resolved: threads.filter((t) => t.resolvedAt).length };
  const shown = threads.filter((t) => (filter === "open") === !t.resolvedAt);

  const { onPassages, general } = useMemo(() => {
    const placed = new Map((anchored ?? []).map((id, index) => [id, index]));
    const isAnchored = (t: DocThread) => (anchored === null ? t.quote !== null && !t.detached : placed.has(t.id));
    const inText = shown.filter(isAnchored).sort((a, b) => (placed.get(a.id) ?? 0) - (placed.get(b.id) ?? 0));
    return { onPassages: inText, general: shown.filter((t) => !isAnchored(t)) };
  }, [shown, anchored]);

  const card = (t: DocThread, onPassage: boolean) => (
    <DocThreadCard key={t.id} projectId={projectId} thread={t} me={me} canWrite={canWrite} owner={owner} actions={actions} anchored={onPassage || t.quote === null} focused={false} />
  );
  const readOnlyReason = commenting.readOnlyReason ?? commenting.selectionReason;

  return (
    <section aria-labelledby="doc-comments-heading" data-testid="doc-comments" className="flex flex-col gap-3 border-t border-[color:var(--jd-line)] pt-5">
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <h3 id="doc-comments-heading" className="text-base font-bold">
          Comments
        </h3>
        <ToggleGroup type="single" value={filter} onValueChange={(next) => next && setFilter(next as "open" | "resolved")} aria-label="Show comments" className="justify-start">
          {FILTERS.map((f) => (
            <ToggleGroupItem key={f.id} value={f.id} className="min-h-11 px-3 text-sm">
              {f.label} ({counts[f.id]})
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {readOnlyReason && (
        <p role="status" className="text-xs text-[color:var(--jd-muted)]" data-testid="doc-comments-readonly">
          {readOnlyReason}
        </p>
      )}
      {status === "loading" && (
        <p role="status" aria-live="polite" className="text-sm text-[color:var(--jd-muted)]">
          Loading comments…
        </p>
      )}
      {status === "error" && (
        <div role="alert" className="flex flex-col gap-2 text-sm">
          <p className="font-medium text-destructive">Couldn&apos;t load the comments: {error}</p>
          <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 self-start" onClick={reload}>
            Try again
          </Button>
        </div>
      )}
      {status === "ready" && general.length === 0 && (
        <p className="text-sm text-[color:var(--jd-muted)]">
          {filter === "resolved"
            ? "No resolved comments on the page."
            : canWrite
              ? "No comments on the page yet. Write one below, or select some text and choose Comment."
              : "No comments on the page."}
        </p>
      )}
      {general.map((t) => card(t, false))}
      {onPassages.length > 0 && (
        <details className="flex flex-col gap-3" data-testid="doc-passage-comments">
          <summary className="flex min-h-11 cursor-pointer flex-row items-center text-sm font-medium text-[color:var(--jd-muted)]">
            <Text>{`On passages of the text (${onPassages.length})`}</Text>
          </summary>
          <div className="flex flex-col gap-3 pt-2">{onPassages.map((t) => card(t, true))}</div>
        </details>
      )}
      {canWrite && status === "ready" && (
        <DocCommentComposer projectId={projectId} label="Page comment" placeholder="Comment on the page…" onSubmit={(text) => actions.add({ text })} />
      )}
    </section>
  );
}
