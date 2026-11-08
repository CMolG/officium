"use client";

import { useEffect, useState } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Badge, Button } from "@javadaba/ui";
import { GitMerge, PlugZap } from "lucide-react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { formatDate } from "../../lib/backlog/format";
import { docsPath } from "../../lib/backlog/search-links";
import {
  isConflict,
  type ChangelogEntry,
  type ChangelogListing,
  type ChangelogTokenStatus,
  type DocPageSummary,
  type DocsStatus,
} from "../../lib/backlog/types";
import { MarkUpdatedDialog } from "./MarkUpdatedDialog";
import { PipelineConnectLink } from "./PipelineConnectLink";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

type Filter = "pending" | "all";

/**
 * The documentation's drift control (JAVA-132, officium-api.md §8.8): every change that reached
 * main, each pending until someone says what the docs did about it -- nothing needed, or which
 * pages were updated. The project's pipeline records the changes; the owner connects it here.
 *
 * Marking is reversible (Reopen puts a change back to pending), so it takes no confirmation.
 */
export function ChangelogPanel({
  projectId,
  repository,
  pages,
  canWrite,
  isOwner,
}: {
  projectId: string;
  repository: BacklogRepository;
  /** The project's pages, for naming the ones a change updated. */
  pages: DocPageSummary[];
  canWrite: boolean;
  isOwner: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("pending");
  const [listing, setListing] = useState<ChangelogListing | null>(null);
  const [token, setToken] = useState<ChangelogTokenStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tick, setTick] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [marking, setMarking] = useState<ChangelogEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([repository.listChangelog(projectId, filter === "pending" ? { status: "pending" } : {}),
      repository.getChangelogToken(projectId)]).then(
      ([nextListing, nextToken]) => {
        if (cancelled) return;
        setListing(nextListing);
        setToken(nextToken);
        setError(null);
      },
      (err) => !cancelled && setError(messageOf(err)),
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, repository, filter, attempt, tick]);

  useEffect(
    () =>
      repository.subscribe(projectId, (event) => {
        if (event.type === "changelog.changed" || event.type === "stream.ready") setTick((n) => n + 1);
      }),
    [projectId, repository],
  );

  /** Resolves to an error to show, or `null` once marked. */
  async function mark(entry: ChangelogEntry, status: DocsStatus, markPages: string[] = []): Promise<string | null> {
    setBusyId(entry.id);
    setNotice(null);
    try {
      const result = await repository.markChangelogEntry(projectId, entry.id, {
        status,
        pages: markPages,
        expectedVersion: entry.version,
      });
      if (isConflict(result)) {
        setNotice(`Someone else marked "${entry.title}" first. Their answer is shown now.`);
      }
      setTick((n) => n + 1);
      return null;
    } catch (err) {
      return messageOf(err);
    } finally {
      setBusyId(null);
    }
  }

  async function markInline(entry: ChangelogEntry, status: DocsStatus) {
    const problem = await mark(entry, status);
    if (problem) setNotice(problem);
  }

  const pendingCount = listing?.pendingCount ?? 0;

  return (
    <section aria-labelledby="changelog-heading" className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="changelog-heading" className="text-xl font-bold">
            Changelog
          </h2>
          <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
            Every change that reached main. Each one stays pending until someone says whether the documentation
            needed it, so no merge leaves the pages behind without anyone noticing.
          </p>
        </div>
        {token && <PipelineStatus token={token} isOwner={isOwner} projectId={projectId} />}
      </div>

      <div role="group" aria-label="Show" className="flex flex-row flex-wrap gap-2">
        <Button
          type="button"
          register="ui"
          size="sm"
          variant={filter === "pending" ? "solid" : "outline"}
          aria-pressed={filter === "pending"}
          onClick={() => setFilter("pending")}
        >
          <span>Pending{listing ? ` · ${pendingCount}` : ""}</span>
        </Button>
        <Button
          type="button"
          register="ui"
          size="sm"
          variant={filter === "all" ? "solid" : "outline"}
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          <span>All changes</span>
        </Button>
      </div>

      {notice && (
        <p role="alert" className="text-sm font-medium">
          {notice}
        </p>
      )}

      {listing === null ? (
        error ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-bad-bg)] p-6">
            <p className="text-sm font-semibold">Couldn&apos;t load the changelog</p>
            <p className="text-sm text-[color:var(--jd-muted)]">{error}</p>
            <Button type="button" register="ui" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              <span>Try again</span>
            </Button>
          </div>
        ) : (
          <p role="status" className="text-sm text-[color:var(--jd-muted)]">
            Loading the changelog…
          </p>
        )
      ) : listing.items.length === 0 ? (
        <EmptyChangelog filter={filter} token={token} isOwner={isOwner} projectId={projectId} />
      ) : (
        <ul className="flex flex-col gap-3" aria-label={filter === "pending" ? "Pending changes" : "Changes"}>
          {listing.items.map((entry) => (
            <ChangeRow
              key={entry.id}
              entry={entry}
              projectId={projectId}
              canWrite={canWrite}
              busy={busyId === entry.id}
              onReviewed={() => void markInline(entry, "reviewed")}
              onUpdated={() => setMarking(entry)}
              onReopen={() => void markInline(entry, "pending")}
            />
          ))}
        </ul>
      )}

      {marking && (
        <MarkUpdatedDialog
          entry={marking}
          pages={pages}
          onClose={() => setMarking(null)}
          onSubmit={async (chosen) => {
            const problem = await mark(marking, "updated", chosen);
            if (!problem) setMarking(null);
            return problem;
          }}
        />
      )}
    </section>
  );
}

function PipelineStatus({
  token,
  isOwner,
  projectId,
}: {
  token: ChangelogTokenStatus;
  isOwner: boolean;
  projectId: string;
}) {
  const label = token.configured
    ? `Pipeline connected${token.createdAt ? ` since ${formatDate(token.createdAt)}` : ""}`
    : "No pipeline connected";
  if (!isOwner) {
    return (
      <p className="flex flex-row items-center gap-1.5 text-xs text-[color:var(--jd-muted)]">
        <PlugZap size={14} aria-hidden="true" />
        <span>{label}</span>
      </p>
    );
  }
  return (
    <PipelineConnectLink projectId={projectId}>
      <PlugZap size={14} aria-hidden="true" />
      <span>{token.configured ? label : "Connect your pipeline"}</span>
    </PipelineConnectLink>
  );
}

function EmptyChangelog({
  filter,
  token,
  isOwner,
  projectId,
}: {
  filter: Filter;
  token: ChangelogTokenStatus | null;
  isOwner: boolean;
  projectId: string;
}) {
  if (filter === "pending") {
    return (
      <div className="flex flex-col items-start gap-2 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6">
        <p className="text-base font-semibold">Nothing pending</p>
        <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
          Every change recorded so far has an answer. New merges show up here as they reach main.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-dashed border-[color:var(--jd-line)] p-6">
      <GitMerge size={22} className="text-[color:var(--jd-muted)]" aria-hidden="true" />
      <p className="text-base font-semibold">No changes recorded yet</p>
      <p className="max-w-prose text-sm text-[color:var(--jd-muted)]">
        {token?.configured
          ? "The pipeline is connected: the next merge to main will show up here."
          : "Connect the project's pipeline and every merge to main lands here, waiting for someone to check the docs."}
      </p>
      {!token?.configured &&
        (isOwner ? (
          <PipelineConnectLink projectId={projectId}>
            <PlugZap size={14} aria-hidden="true" />
            <span>Connect your pipeline</span>
          </PipelineConnectLink>
        ) : (
          <p className="text-xs text-[color:var(--jd-muted)]">The project&apos;s owner connects it.</p>
        ))}
    </div>
  );
}

const STATUS_LABEL: Record<DocsStatus, string> = {
  pending: "Pending",
  reviewed: "Reviewed, no change needed",
  updated: "Docs updated",
};

function ChangeRow({
  entry,
  projectId,
  canWrite,
  busy,
  onReviewed,
  onUpdated,
  onReopen,
}: {
  entry: ChangelogEntry;
  projectId: string;
  canWrite: boolean;
  busy: boolean;
  onReviewed: () => void;
  onUpdated: () => void;
  onReopen: () => void;
}) {
  const ref = entry.ref.length > 12 ? entry.ref.slice(0, 12) : entry.ref;
  return (
    <li
      data-testid="changelog-entry"
      data-status={entry.status}
      className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4"
    >
      <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--jd-muted)]">
        <time dateTime={entry.mergedAt}>{formatDate(entry.mergedAt)}</time>
        {entry.url ? (
          <a href={entry.url} target="_blank" rel="noreferrer" className="font-mono underline underline-offset-2 hover:text-[color:var(--jd-ink)]">
            <span>{ref}</span>
          </a>
        ) : (
          <span className="font-mono">{ref}</span>
        )}
        <Badge register="tag" tone={entry.status === "pending" ? "warning" : "success"} fill="subtle">
          <span>{STATUS_LABEL[entry.status]}</span>
        </Badge>
      </div>
      <p className="text-sm font-semibold break-words">{entry.title}</p>
      {entry.areas.length > 0 && (
        <p className="flex flex-row flex-wrap gap-1.5" aria-label="Areas">
          {entry.areas.map((area) => (
            <span key={area} className="rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] px-1.5 py-0.5 font-mono text-xs">
              {area}
            </span>
          ))}
        </p>
      )}
      {entry.status === "updated" && (
        <p className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="text-[color:var(--jd-muted)]">Pages updated:</span>
          {entry.pages.map((page) => (
            <Link key={page} href={docsPath(projectId, page)} className="font-mono text-xs underline underline-offset-2">
              <span>{page}</span>
            </Link>
          ))}
        </p>
      )}
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[color:var(--jd-muted)]">
          {entry.markedBy && entry.markedAt
            ? `Marked by ${entry.markedBy.name} on ${formatDate(entry.markedAt)}`
            : `Recorded by ${entry.recordedBy.name}`}
        </p>
        {canWrite && (
          <div className="flex flex-row flex-wrap gap-2">
            {entry.status === "pending" ? (
              <>
                <Button type="button" register="ui" size="sm" variant="outline" disabled={busy} onClick={onReviewed}>
                  <span>No change needed</span>
                </Button>
                <Button type="button" register="ui" size="sm" disabled={busy} onClick={onUpdated}>
                  <span>Pages updated…</span>
                </Button>
              </>
            ) : (
              <Button type="button" register="ui" size="sm" variant="ghost" disabled={busy} onClick={onReopen}>
                <span>Reopen</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
