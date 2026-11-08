"use client";

import { Button } from "@javadaba/ui";

import { CATEGORY_CONFIG } from "../../lib/backlog/category-config";
import { runsOn } from "../../lib/backlog/format";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import type { BoardCard } from "../../lib/backlog/board-copy";
import type { AgentWork } from "../../lib/backlog/types";
import { CategoryIcon } from "./CategoryMarker";
import { StatusShape } from "./StatusShape";

export interface AgentWorkToastItem {
  work: AgentWork;
  card: BoardCard;
}

/** One card being worked: its category and status (JAVA-584, the glyphs the board's cards draw), key,
 *  title, whose agent, what it runs on and its latest status, and an Open. Shared with the projects
 *  home's tray (JAVA-120), so a card reads the same in both. */
export function AgentWorkRow({ work, card, onOpen }: AgentWorkToastItem & { onOpen: () => void }) {
  const model = runsOn(work.model, work.effort);
  const status = STATUS_CONFIG[card.status].label;
  return (
    <li className="flex flex-row items-center gap-3 border-b border-[color:var(--jd-line)] px-4 py-2 last:border-b-0">
      {/* Shapes, not colours (interface-psychology #4): a glyph per category and a polygon per
          status read the same in grayscale, and each carries its name for a screen reader. */}
      <div className="flex shrink-0 flex-row items-center gap-1.5">
        {card.category && (
          <span title={CATEGORY_CONFIG[card.category].label} data-testid="agent-work-category" className="flex flex-row">
            <CategoryIcon category={card.category} size={16} />
            <span className="sr-only">{CATEGORY_CONFIG[card.category].label}</span>
          </span>
        )}
        <StatusShape status={card.status} className="size-4 shrink-0" title={status} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[color:var(--jd-ink)]">
          <span className="font-[family-name:var(--font-jd-kicker)] text-xs uppercase tracking-widest text-[color:var(--jd-muted)]">
            {card.key}
          </span>{" "}
          {card.title}
        </p>
        {/* Whose agent, and from which machine (JAVA-199/200), on the same line as its status:
            two people's agents, or one person's two machines, no longer look the same, and
            the tray keeps its height (a taller one covered the board's filters). */}
        <p className="truncate text-xs text-[color:var(--jd-muted)]">
          {work.actor.agentName ?? work.actor.name}
          {work.actor.machine ? ` on ${work.actor.machine}` : ""}
          {model ? ` (${model})` : ""}
          {work.statuses[0] ? `: ${work.statuses[0].text}` : " started working on it"}
        </p>
      </div>
      <Button type="button" register="ui" variant="outline" size="sm" className="shrink-0" onClick={onOpen}>
        Open
      </Button>
    </li>
  );
}
