import { ArrowRight, Hourglass, UserRound } from "lucide-react";

import type { CardRequest } from "../../lib/backlog/card-requests";
import type { Card } from "../../lib/backlog/types";
import { answerLabel } from "../../lib/backlog/format";
import { matchesSearch } from "../../lib/backlog/card-search";
import { useOpenRequests } from "./CardRequestsContext";

export interface NeedsYouItem {
  card: Card;
  projectId: string;
  /** Only shown when this lane spans several projects (the projects home). */
  projectName?: string;
}

const ITEM =
  "flex w-64 shrink-0 cursor-pointer flex-col gap-0.5 rounded-[var(--radius-jd-md)] bg-[color:var(--jd-raised)] px-3 py-2 text-left shadow-[0_0_0_1px_var(--jd-line)] transition-shadow hover:shadow-[0_0_0_1px_var(--jd-control-border)]";

/**
 * Pinned lane of open `human` cards assigned to the current person, each showing what it
 * unblocks (JDB-239 directive), and the requests agents made (Off-Board, "Needs you"). A warm band with a
 * white chip per item: the project (on the home), the key and title, Answer with its question count when
 * the card is a form, and what it unblocks. One presentational component, two callers: `Board` (this
 * project only) and `ProjectsHomeSurface` (every project, `projectName` shown).
 */
export function NeedsYouLane({ items: all, search = "", onOpen, onOpenRequest }: { items: NeedsYouItem[]; search?: string; onOpen: (item: NeedsYouItem) => void; onOpenRequest?: (request: CardRequest) => void }) {
  const allRequests = useOpenRequests();
  const total = all.length + allRequests.length;
  if (total === 0) return null;
  // Searching the board filters this lane too, and says how many of its items match (Off-Board, "Needs you follows the search").
  const needle = search.trim().toLowerCase();
  const items = all.filter((item) => matchesSearch(item.card, search));
  const requests = needle ? allRequests.filter((r) => `${r.cardKey} ${r.action}`.toLowerCase().includes(needle)) : allRequests;
  const shown = items.length + requests.length;
  // A lane where some card has a form reserves the line on every card, so none changes the others' height.
  const anyForm = items.some((item) => item.card.formQuestions);

  return (
    <section aria-label="Needs you" className="officium-rise shrink-0 px-4 py-3 sm:px-6">
      <div className="flex flex-col gap-2 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-warn-bg)] px-3 py-2.5">
        <h2 className="m-0 flex flex-row items-center gap-1.5 text-sm font-bold text-[color:var(--jd-ink)]">
          <UserRound size={14} aria-hidden="true" /> Needs you · {shown === total ? total : `${shown} of ${total}`}
        </h2>
        {/* Every card is the same box (JAVA-121): a fixed width, the title clamped to two lines
            with both reserved, and the "unblocks" line always present -- an invisible placeholder
            when the card unblocks nothing -- so no content can change a card's height. */}
        {shown === 0 && <p role="status" className="m-0 text-xs text-[color:var(--jd-muted)]">Nothing here matches the search.</p>}
        <ul className="m-0 flex list-none flex-row items-stretch gap-2 overflow-x-auto p-0 pb-1">
          {requests.map((request) => (
            <li key={request.id} className="flex shrink-0 flex-row">
              <button type="button" onClick={() => onOpenRequest?.(request)} data-testid="needs-you-request" className={ITEM}>
                <span className="flex flex-row items-center gap-1 text-xs font-semibold text-[color:var(--jd-warn)]">
                  <Hourglass size={11} aria-hidden="true" className="shrink-0" />
                  Waiting for you
                </span>
                <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
                  {request.cardKey} · {request.action}
                </span>
              </button>
            </li>
          ))}
          {items.map((item) => (
            <li key={`${item.projectId}-${item.card.id}`} className="flex shrink-0 flex-row">
              <button type="button" onClick={() => onOpen(item)} data-theater-target="needs-you-card" className={ITEM}>
                {item.projectName && (
                  <span className="truncate text-xs font-medium text-[color:var(--jd-muted)]">{item.projectName}</span>
                )}
                <span className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">
                  {item.card.key}: {item.card.title}
                </span>
                {anyForm && (
                  <span
                    aria-hidden={!item.card.formQuestions || undefined}
                    data-testid={item.card.formQuestions ? "needs-you-answer" : undefined}
                    className={`flex flex-row ${item.card.formQuestions ? "" : "invisible"}`}
                  >
                    <span className="rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-ink)] px-2 py-0.5 text-xs font-semibold leading-4 text-[color:var(--jd-page)]">
                      {answerLabel(item.card.formQuestions ?? 0)}
                    </span>
                  </span>
                )}
                <span
                  aria-hidden={item.card.blocks.length === 0 || undefined}
                  className={`flex min-w-0 flex-row items-center gap-1 text-xs leading-4 text-[color:var(--jd-muted)] ${item.card.blocks.length === 0 ? "invisible" : ""}`}
                >
                  <ArrowRight size={11} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">
                    {item.card.blocks.length > 0 ? `unblocks ${item.card.blocks.join(", ")}` : "unblocks nothing"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
