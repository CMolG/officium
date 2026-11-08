"use client";

import { useId, useMemo, useState } from "react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Label, SearchInput, Select, Text } from "@javadaba/ui";

import type { BoardCard } from "../../lib/backlog/board-copy";
import { findLinkTargets, linkWrite, type LinkKind, LINK_KIND_OPTIONS } from "../../lib/backlog/add-link";
import type { BacklogRepository } from "../../lib/backlog/repository";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { isConflict, type Card, type CardDetail } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { StatusShape } from "./StatusShape";

export interface AddLinkDialogProps {
  projectId: string;
  repository: BacklogRepository;
  detail: CardDetail;
  /** The cards the board knows: the ones a link can point at. */
  cards: BoardCard[];
  onClose: () => void;
  onChanged: (next: CardDetail) => void | Promise<void>;
  reportConflict: (result: { error: "version_conflict"; message: string; current: Card }, retry: () => Promise<void>) => void;
}

/**
 * Add a link (Off-Card 2, "Delete a card and add a link"): the kind of link (Blocks, Blocked by, Related) and the
 * card it joins, found by key or title. A link that would close a cycle is refused by the server and the
 * dialog says so, where the person is looking.
 */
export function AddLinkDialog({ projectId, repository, detail, cards, onClose, onChanged, reportConflict }: AddLinkDialogProps) {
  const returnFocus = useReturnFocus();
  const [kind, setKind] = useState<LinkKind>("blocks");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<BoardCard | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const listId = useId();
  const matches = useMemo(() => findLinkTargets(cards, detail, kind, query), [cards, detail, kind, query]);

  async function add(card: BoardCard) {
    setBusy(true);
    setProblem(null);
    try {
      const result = await linkWrite(repository, projectId, detail, kind, card);
      if (isConflict(result)) {
        reportConflict(result, async () => {
          await add(card);
        });
        return;
      }
      await onChanged(await repository.getCard(projectId, detail.id));
      onClose();
    } catch (err) {
      setProblem(err instanceof Error ? err.message : "Couldn't add the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md" data-testid="add-link-dialog">
        <DialogTitle>Add a link</DialogTitle>
        <DialogDescription>Join {detail.key} to another card of this project.</DialogDescription>
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Text className="text-sm font-medium">Kind of link</Text>
            <Select
              aria-label="Kind of link"
              value={kind}
              options={LINK_KIND_OPTIONS}
              onChange={(next) => {
                setKind(next as LinkKind);
                setTarget(null);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${listId}-find`}>Card</Label>
            <SearchInput
              id={`${listId}-find`}
              placeholder="Find a card by key or title"
              value={query}
              onValueChange={(next) => {
                setQuery(next);
                setTarget(null);
              }}
              aria-controls={listId}
            />
            <ul id={listId} role="listbox" aria-label="Cards to link" className="flex max-h-56 flex-col gap-1 overflow-y-auto">
              {matches.map((card) => (
                <li key={card.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={target?.id === card.id}
                    onClick={() => setTarget(card)}
                    className="flex min-h-11 w-full flex-row items-center gap-3 rounded-[var(--radius-jd-control)] border border-transparent px-3 text-left text-sm hover:bg-[color:var(--jd-hover)] aria-selected:border-[color:var(--jd-ink)] aria-selected:bg-[color:var(--jd-card)]"
                  >
                    <StatusShape status={card.status} className="size-4 shrink-0" title={STATUS_CONFIG[card.status].label} />
                    <span className="shrink-0 font-[family-name:var(--font-jd-kicker)] text-xs uppercase tracking-widest">{card.key}</span>
                    <span className="min-w-0 truncate">{card.title}</span>
                  </button>
                </li>
              ))}
              {matches.length === 0 && (
                <li role="presentation">
                  <Text className="text-sm text-[color:var(--jd-muted)]">{query.trim() ? "No card matches." : "No other card to link yet."}</Text>
                </li>
              )}
            </ul>
          </div>
          {problem && (
            <p role="alert" className="text-sm text-[color:var(--jd-bad)]">
              {problem}
            </p>
          )}
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <DialogClose asChild>
            <Button type="button" register="ui" size="sm" variant="outline" className="min-h-11 sm:min-h-0">
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" busy={busy} disabled={!target || busy} onClick={() => target && void add(target)}>
            <Text>Add link</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
