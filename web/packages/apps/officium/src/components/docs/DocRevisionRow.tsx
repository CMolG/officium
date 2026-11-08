"use client";

import { useState } from "react";
import { Bot, Download, GitCompare, RotateCcw, Trash2, UserRound } from "lucide-react";
import { Button, Text } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import type { DocRevision } from "../../lib/backlog/types";
import { formatBytes } from "../../lib/docs/format-bytes";
import { actorName } from "./DocConflictPanel";
import { RevisionDiff } from "./RevisionDiff";

/** One kept version: what it weighed, who wrote it, when it goes, and the four things to do with it. */
export function DocRevisionRow({
  revision,
  currentBody,
  canWrite,
  busy,
  onRestore,
  onDownload,
  onDelete,
}: {
  revision: DocRevision;
  currentBody: string;
  canWrite: boolean;
  busy: boolean;
  onRestore: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [comparing, setComparing] = useState(false);
  const author = revision.author;
  const reason = canWrite ? undefined : "Restoring or deleting a version needs editor access.";
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4" data-testid="doc-revision">
      <div className="flex flex-row flex-wrap items-baseline justify-between gap-2">
        <Text className="text-sm font-semibold">{`Version ${revision.version}`}</Text>
        <Text className="text-xs text-[color:var(--jd-muted)]" data-testid="revision-expiry">
          {revision.expiresAt === null ? "Never expires (the heaviest version)" : `Expires ${formatDate(revision.expiresAt.slice(0, 10))}`}
        </Text>
      </div>
      <p className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[color:var(--jd-muted)]">
        <span>{formatBytes(revision.sizeBytes)}</span>
        <span className="flex flex-row items-center gap-1">
          {author?.kind === "agent" ? <Bot size={12} aria-hidden="true" /> : <UserRound size={12} aria-hidden="true" />}
          <span>{author ? `${actorName(author)}${author.kind === "agent" ? " (agent)" : ""}` : "Unknown"}</span>
        </span>
        <span>{`Written ${formatDate(revision.writtenAt.slice(0, 10))}`}</span>
      </p>
      <div className="flex flex-row flex-wrap gap-2">
        <Button type="button" register="ui" size="sm" variant="outline" aria-pressed={comparing} onClick={() => setComparing((v) => !v)}>
          <GitCompare size={14} aria-hidden="true" /> {comparing ? "Hide comparison" : "Compare"}
        </Button>
        <Button type="button" register="ui" size="sm" variant="outline" disabled={!canWrite || busy} title={reason} onClick={onRestore}>
          <RotateCcw size={14} aria-hidden="true" /> Restore
        </Button>
        <Button type="button" register="ui" size="sm" variant="outline" onClick={onDownload}>
          <Download size={14} aria-hidden="true" /> Download
        </Button>
        <Button type="button" register="ui" size="sm" variant="ghost" disabled={!canWrite || busy} title={reason} onClick={onDelete}>
          <Trash2 size={14} aria-hidden="true" /> Delete
        </Button>
      </div>
      {!canWrite && <Text className="text-xs text-[color:var(--jd-muted)]">{reason}</Text>}
      {comparing && <RevisionDiff kept={revision.body} current={currentBody} />}
    </li>
  );
}
