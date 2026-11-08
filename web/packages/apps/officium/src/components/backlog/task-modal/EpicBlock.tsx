"use client";

import { Select, Text } from "@javadaba/ui";

import type { BoardCard } from "../../../lib/backlog/board-copy";
import type { CardDetail } from "../../../lib/backlog/types";

const NO_EPIC = "__no-epic__";

/**
 * The epic a card belongs to, chosen from the project's epic cards (Off-Card, "Epic: Data out"). A value written
 * as free text by an agent that names no epic card stays selectable, so opening the card never rewrites it.
 * An epic is not itself in an epic.
 */
export function EpicBlock({ detail, cards, readOnly, save }: { detail: CardDetail; cards: BoardCard[]; readOnly: boolean; save: (epic: string | null) => Promise<void> }) {
  if (detail.category === "epic") return null;
  const epics = cards.filter((card) => card.category === "epic" && card.id !== detail.id);
  const current = detail.epic?.trim() || null;
  const named = current ? epics.find((epic) => epic.key.toLowerCase() === current.toLowerCase() || epic.title.toLowerCase() === current.toLowerCase()) : undefined;
  if (readOnly && !current) return null;
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Epic</h3>
      {readOnly ? (
        <Text data-testid="card-epic" className="text-sm font-semibold">{named ? `${named.key} · ${named.title}` : current}</Text>
      ) : (
        <Select
          aria-label="Epic"
          value={named?.key ?? current ?? NO_EPIC}
          onChange={(next) => void save(next === NO_EPIC ? null : next)}
          options={[
            { value: NO_EPIC, label: "No epic" },
            ...epics.map((epic) => ({ value: epic.key, label: `${epic.key} · ${epic.title}` })),
            ...(current && !named ? [{ value: current, label: current }] : []),
          ]}
          menuWidth={280}
        />
      )}
    </div>
  );
}
