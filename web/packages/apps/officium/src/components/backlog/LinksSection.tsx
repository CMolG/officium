"use client";

import { useState } from "react";
import { Link2, Plus } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import type { BoardCard } from "../../lib/backlog/board-copy";
import { useReadOnly } from "../../lib/backlog/read-only-context";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { Card, CardDetail } from "../../lib/backlog/types";
import { AddLinkDialog } from "./AddLinkDialog";
import { LinkSection } from "./LinkSection";
import { RelatedBySection } from "./RelatedBySection";

export interface LinksSectionProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  allCards: BoardCard[];
  onOpenOther: (cardId: string) => void;
  onChanged: (next: CardDetail) => void | Promise<void>;
  reportConflict: (result: { error: "version_conflict"; message: string; current: Card }, retry: () => Promise<void>) => void;
  onError: (message: string) => void;
}

/**
 * The card's links (Off-Card, "Add a link · new"): Blocked by, Blocks, Related and Related by under one heading, and
 * the way to add one from the card. Blocks / blocked by / related stay three distinct groups over the single `blocks`
 * edge (JDB-239 directive; `related` stays separate). A viewer reads them; only an editor adds.
 */
export function LinksSection({ projectId, repository, detail, allCards, onOpenOther, onChanged, reportConflict, onError }: LinksSectionProps) {
  const readOnly = useReadOnly();
  const [adding, setAdding] = useState(false);
  const empty = detail.blockedBy.length + detail.blocks.length + detail.related.length + detail.relatedBy.length === 0;
  if (empty && readOnly) return null;
  return (
    <section aria-label="Links" data-testid="card-links" className="flex flex-col gap-3">
      <div className="flex flex-row items-center justify-between gap-2 border-b border-[color:var(--jd-line)] pb-2">
        <h3 className="flex flex-row items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Link2 size={16} aria-hidden="true" /> Links
        </h3>
        {!readOnly && (
          <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden="true" />
            <Text>Add a link</Text>
          </Button>
        )}
      </div>
      {empty && <Text className="text-sm text-[color:var(--jd-muted)]">No links yet.</Text>}
      {detail.blockedBy.length > 0 && <LinkSection title="Blocked by" keys={detail.blockedBy} allCards={allCards} onOpenOther={onOpenOther} />}
      {detail.blocks.length > 0 && <LinkSection title="Blocks" keys={detail.blocks} allCards={allCards} onOpenOther={onOpenOther} />}
      {detail.related.length > 0 && <LinkSection title="Related" keys={detail.related} allCards={allCards} onOpenOther={onOpenOther} />}
      <RelatedBySection
        projectId={projectId}
        repository={repository}
        detail={detail}
        allCards={allCards}
        onOpenOther={onOpenOther}
        onChanged={onChanged}
        reportConflict={reportConflict}
        onError={onError}
      />
      {adding && (
        <AddLinkDialog
          projectId={projectId}
          repository={repository}
          detail={detail}
          cards={allCards}
          onClose={() => setAdding(false)}
          onChanged={onChanged}
          reportConflict={reportConflict}
        />
      )}
    </section>
  );
}
