"use client";

import { GitCompareArrows } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import type { Actor, DocPage } from "../../lib/backlog/types";
import { VersionCard } from "./DocVersionCard";

export interface Conflict {
  theirs: DocPage;
  mine: { title: string; body: string };
}

export const actorName = (actor: Actor) => (actor.kind === "agent" ? (actor.agentName ?? actor.name) : actor.name);

/**
 * Two people saved the same page (Doc-Edit, "The conflict panel · it replaces the editor"): theirs and yours side by side,
 * nothing overwritten, and three ways out. Merge them keeps both where they do not overlap.
 */
export function ConflictPanel({
  conflict,
  saving,
  error,
  onMerge,
  onKeepMine,
  onUseTheirs,
}: {
  conflict: Conflict;
  saving: boolean;
  error: string | null;
  onMerge: () => void;
  onKeepMine: () => void;
  onUseTheirs: () => void;
}) {
  const { theirs, mine } = conflict;
  return (
    <section aria-label="Save conflict" className="flex flex-col gap-4" data-testid="doc-conflict">
      <div className="flex flex-row items-start gap-3">
        <GitCompareArrows size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold">Someone else saved this page first. Nothing was overwritten.</h2>
          <Text className="text-sm text-[color:var(--jd-muted)]">
            {actorName(theirs.updatedBy)} saved on {formatDate(theirs.updatedAt.slice(0, 10))}. Compare and choose.
          </Text>
        </div>
      </div>
      <div className="flex flex-col gap-4 md:flex-row">
        <VersionCard
          label={`Their version · ${actorName(theirs.updatedBy)}${theirs.updatedBy.kind === "agent" ? " (agent)" : ""}, ${formatDate(theirs.updatedAt.slice(0, 10))}`}
          title={theirs.title}
          body={theirs.body}
        />
        <VersionCard label="Your version · not saved" title={mine.title} body={mine.body} />
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-[color:var(--jd-bad)]">
          {error}
        </p>
      )}
      <div className="flex flex-row flex-wrap justify-end gap-2">
        <Button type="button" register="ui" variant="outline" onClick={onUseTheirs} disabled={saving}>
          Use theirs
        </Button>
        <Button type="button" register="ui" variant="outline" onClick={onKeepMine} disabled={saving}>
          {saving ? "Saving…" : "Keep mine"}
        </Button>
        <Button type="button" register="ui" onClick={onMerge} disabled={saving}>
          Merge them
        </Button>
      </div>
    </section>
  );
}
