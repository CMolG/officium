"use client";

import { useState } from "react";
import { Undo2, X } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { isConflict, type Card, type CardDetail } from "../../lib/backlog/types";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { StatusShape } from "./StatusShape";
import type { BoardCard } from "../../lib/backlog/board-copy";

type RelatedBy = Card["relatedBy"][number];

const DIRECTION_TEXT: Record<RelatedBy["direction"], string> = {
  blockedThis: "blocked this card",
  blockedByThis: "this card blocked it",
};

/**
 * "Related by" (JAVA-1114): the cards joined to this one by a `blocks` link whose blocker finished.
 * Removing one removes that same `blocks` edge, from either end, so Undo re-links it the way it was.
 */
export function RelatedBySection({
  projectId,
  repository,
  detail,
  allCards,
  onOpenOther,
  onChanged,
  reportConflict,
  onError,
}: {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  allCards: BoardCard[];
  onOpenOther: (cardId: string) => void;
  onChanged: (next: CardDetail) => void | Promise<void>;
  reportConflict: (result: { error: "version_conflict"; message: string; current: Card }, retry: () => Promise<void>) => void;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState<{ cardId: string; entry: RelatedBy } | null>(null);
  const undoable = removed && removed.cardId === detail.id ? removed.entry : null;
  if (detail.relatedBy.length === 0 && !undoable) return null;

  /** Writes the edge through the card it was stored from: the blocker, in either direction. */
  async function change(entry: RelatedBy, action: "link" | "unlink"): Promise<boolean> {
    const blockerIsThis = entry.direction === "blockedByThis";
    setBusy(true);
    try {
      // The blocker's version is read now: removing the link touched both cards.
      const source = blockerIsThis ? detail : await repository.getCard(projectId, entry.key);
      const input = { expectedVersion: source.version, type: "blocks" as const, target: blockerIsThis ? entry.key : detail.key };
      const result = action === "link"
        ? await repository.linkCard(projectId, source.id, input)
        : await repository.unlinkCard(projectId, source.id, input);
      if (isConflict(result)) {
        reportConflict(result, async () => {
          await change(entry, action);
        });
        return false;
      }
      const fresh = await repository.getCard(projectId, detail.id);
      await onChanged(fresh);
      return true;
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't change the link.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: RelatedBy) {
    if (await change(entry, "unlink")) setRemoved({ cardId: detail.id, entry });
  }

  async function undo() {
    if (!undoable) return;
    const entry = undoable;
    setRemoved(null);
    await change(entry, "link");
  }

  return (
    <section aria-label="Related by" data-testid="related-by" className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--jd-muted)]">Related by</h4>
      <div className="flex flex-col gap-2">
        {detail.relatedBy.map((entry) => {
          const rel = allCards.find((c) => c.key === entry.key);
          return (
            <div key={entry.key} className="flex flex-row items-center gap-2">
              <button
                type="button"
                disabled={!rel}
                onClick={() => rel && onOpenOther(rel.id)}
                className="flex flex-row min-h-11 min-w-0 flex-1 items-center justify-between gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3 text-left transition-colors hover:border-[color:var(--jd-ink)]/40"
              >
                <span className="flex flex-row min-w-0 items-center gap-3">
                  <span className="shrink-0 rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] px-2 py-1 font-[family-name:var(--font-jd-kicker)] text-xs uppercase tracking-widest">{entry.key}</span>
                  <span className="flex min-w-0 flex-col">
                    {/* A finished card is fetched after the board (use-linkable-cards): until then the key chip names it, once. */}
                    {rel && <span className="truncate text-sm font-semibold">{rel.title}</span>}
                    <span className="text-xs text-[color:var(--jd-muted)]">{DIRECTION_TEXT[entry.direction]}</span>
                  </span>
                </span>
                {rel && <StatusShape status={rel.status} className="size-4 shrink-0" title={STATUS_CONFIG[rel.status].label} />}
              </button>
              <Button
                type="button"
                register="ui"
                size="sm"
                variant="outline"
                className="size-11 shrink-0"
                disabled={busy}
                aria-label={`Remove link to ${entry.key}`}
                title={`Remove the link to ${entry.key}`}
                onClick={() => void remove(entry)}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </div>
      {undoable && (
        <p role="status" data-testid="related-by-removed" className="flex flex-row items-center gap-2 text-xs">
          <Text>Link to {undoable.key} removed.</Text>
          <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0" disabled={busy} onClick={() => void undo()}>
            <Undo2 size={14} aria-hidden="true" /> <Text>Undo</Text>
          </Button>
        </p>
      )}
    </section>
  );
}
