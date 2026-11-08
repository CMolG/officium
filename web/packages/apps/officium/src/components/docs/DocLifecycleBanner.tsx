"use client";

import { useState } from "react";
import { Button, Note } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import type { Actor, DocPage } from "../../lib/backlog/types";

const actorName = (actor: Actor) => (actor.kind === "agent" ? (actor.agentName ?? actor.name) : actor.name);

/**
 * What a page's life says above it, in words (JAVA-793): an unpublished draft only its creator sees,
 * with Publish; an archived page, who archived it and when, with Unarchive. A published page in the
 * tree says nothing. The UI calls the first an "unpublished draft", never just "draft": the
 * frontmatter's `status: draft` means something else.
 */
export function DocLifecycleBanner({
  page,
  canWrite,
  onPublish,
  onUnarchive,
}: {
  page: DocPage;
  canWrite: boolean;
  onPublish: () => Promise<string | null>;
  onUnarchive: () => Promise<string | null>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unpublished = page.publishedAt === null;
  if (!unpublished && !page.archivedAt) return null;

  async function run(action: () => Promise<string | null>) {
    setBusy(true);
    setError(null);
    const problem = await action();
    setBusy(false);
    if (problem) setError(problem);
  }

  return (
    <Note tone="info" role="status" data-testid={unpublished ? "unpublished-banner" : "archived-banner"}>
      <div className="flex flex-row flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1 basis-56">
        {unpublished
          ? "Unpublished draft: only you can see it. Agents and the rest of the project see it once you publish."
          : `Archived by ${page.archivedBy ? actorName(page.archivedBy) : "someone"} on ${formatDate((page.archivedAt ?? "").slice(0, 10))}. It is out of the tree and the search, and it can't be edited until it is unarchived.`}
      </p>
      {canWrite && (
        <Button type="button" register="ui" size="sm" disabled={busy} onClick={() => void run(unpublished ? onPublish : onUnarchive)}>
          {unpublished ? (busy ? "Publishing…" : "Publish") : busy ? "Unarchiving…" : "Unarchive"}
        </Button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      </div>
    </Note>
  );
}
