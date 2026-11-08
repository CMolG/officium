import type { SelectOption } from "@javadaba/ui";

import type { BoardCard } from "./board-copy";
import type { BacklogRepository } from "./repository";
import type { Card, CardDetail, WriteResult } from "./types";

/** The three kinds of link a person adds from a card (Off-Card 2): over two stored edges, `blocks` and `related`. */
export type LinkKind = "blocks" | "blockedBy" | "related";

export const LINK_KIND_OPTIONS: SelectOption[] = [
  { value: "blocks", label: "Blocks" },
  { value: "blockedBy", label: "Blocked by" },
  { value: "related", label: "Related" },
];

const MAX_MATCHES = 8;

/** The cards a link could join this one to, by key or title: never itself, never one the kind already holds. */
export function findLinkTargets(cards: BoardCard[], detail: CardDetail, kind: LinkKind, query: string): BoardCard[] {
  const already = new Set<string>(kind === "blocks" ? detail.blocks : kind === "blockedBy" ? detail.blockedBy : detail.related);
  const needle = query.trim().toLowerCase();
  return cards
    .filter((card) => card.id !== detail.id && !already.has(card.key))
    .filter((card) => needle === "" || card.key.toLowerCase().includes(needle) || card.title.toLowerCase().includes(needle))
    .slice(0, MAX_MATCHES);
}

/**
 * Writes the edge. `blocks` and `related` are stored on this card; "Blocked by" is the same `blocks` edge stored
 * on the blocker, so it is written through that card, at the version it has now (as removing a link does).
 */
export async function linkWrite(
  repository: BacklogRepository,
  projectId: string,
  detail: CardDetail,
  kind: LinkKind,
  other: BoardCard,
): Promise<WriteResult<Card>> {
  if (kind === "blockedBy") {
    const blocker = await repository.getCard(projectId, other.key);
    return repository.linkCard(projectId, blocker.id, { expectedVersion: blocker.version, type: "blocks", target: detail.key });
  }
  return repository.linkCard(projectId, detail.id, {
    expectedVersion: detail.version,
    type: kind === "related" ? "related" : "blocks",
    target: other.key,
  });
}
