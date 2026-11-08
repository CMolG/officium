import { forwardRef, type HTMLAttributes, type KeyboardEvent } from "react";
import { Bot } from "lucide-react";

import type { BoardCard } from "../../lib/backlog/board-copy";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "../../lib/backlog/status-config";
import { StatusShape } from "./StatusShape";
import { BlockedMarker, ExecutorMarker } from "./ExecutorMarker";
import { CategoryMarker } from "./CategoryMarker";
import { WorkingSnake } from "./WorkingSnake";
import { WorkingNowMarker } from "./WorkingNowMarker";
import { WaitingForYouMarker } from "./WaitingForYouMarker";
import { WakeReasonMark } from "./WakeReasonMark";
import { PrecedenceMark } from "./PrecedenceMark";
import { EpicBadge, useEpicRef } from "./EpicBadge";
import { EpicProgressBadge } from "./EpicProgressBadge";
import { checkpointsCompleted } from "../../lib/backlog/checkpoints";
import { useHideWho } from "../../lib/backlog/hide-who-context";
import { useWaitingForYou } from "./CardRequestsContext";

export interface TaskCardProps extends HTMLAttributes<HTMLElement> {
  card: BoardCard;
  logged: number;
  /** Board columns render a denser face; list/stack render the full one. */
  compact?: boolean;
  /** Dimmed when it doesn't match the active search/filters (board view only). */
  muted?: boolean;
  /** An agent is working on it right now (officium-api.md §4.1): the moving border + a marker. */
  activelyWorking?: boolean;
  onOpen: () => void;
}

/** Hours as the tile says them: "3.5", "6", never "3.50". */
const hours = (value: number) => String(Number(value.toFixed(2)));

/**
 * The tile -- shared by the board, list and stack views (Off-Vocab, "One card, many places"). Reads only
 * `Card` + `logged` hours (a derived number the caller computes from the card's time entries), never the
 * repository: the same discipline that keeps `BacklogRepository` swappable in JDB-226.
 *
 * Top to bottom: the key, the epic and its checkpoints, the priority; on the full tile the status; the
 * title; on the full tile one line of the description; the category and who executes it; the flags
 * (working now, waiting for you, blocked, why it waits); on the full tile the hours against the estimate;
 * and, when an agent made the last change, who. Every mark has a shape and a word, never colour alone.
 *
 * Forwards a ref and accepts arbitrary DOM props (merged, not overwritten) so the board's
 * `SortableTaskCard` can turn THIS SAME element into `@dnd-kit`'s drag handle instead of
 * wrapping it in a second focusable element -- two nested `role="button"`s would double the
 * card's tab stops and give the keyboard sensor's `Space`/arrow handling and this component's
 * own `Enter`-to-open two different elements to fight over.
 */
export const TaskCard = forwardRef<HTMLElement, TaskCardProps>(function TaskCard(
  { card, logged, compact = false, muted = false, activelyWorking = false, onOpen, onKeyDown, onClick, className, ...rest },
  ref,
) {
  const status = STATUS_CONFIG[card.status];
  const priority = PRIORITY_CONFIG[card.priority];
  const PriorityIcon = priority.icon;
  const pct = card.estimate > 0 ? Math.min(100, Math.round((logged / card.estimate) * 100)) : 0;
  const epic = useEpicRef(card);
  const waitingForYou = useWaitingForYou(card.id);
  // A viewer is not told who did the work unless the project shows it (Configuration, Sharing).
  const hideWho = useHideWho();
  const hasFlags = activelyWorking || waitingForYou || card.blockedBy.length > 0 || Boolean(card.wakeReason);

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    // The drag handle's own keydown (Space to pick up, arrows to move) runs first; only if it
    // didn't claim the key does Enter open the card -- so `Space`/arrows never also open it.
    onKeyDown?.(e);
    if (!e.defaultPrevented && e.key === "Enter") onOpen();
  }

  return (
    <article
      ref={ref}
      onClick={(e) => {
        onClick?.(e);
        // A generic `role="button"` element (unlike a native `<button>`) is not auto-focused by
        // a mouse click in Chromium/WebKit -- so without this, `document.activeElement` when
        // the dialog mounts is whatever it was before, and Radix's focus-trap has nothing of
        // ours to RETURN focus to on close (JDB-224 item 3: "focus return" only works if there
        // was a focused trigger to return to).
        e.currentTarget.focus();
        onOpen();
      }}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      data-muted={muted || undefined}
      aria-label={`${card.key}: ${card.title}${epic ? ` (epic: ${epic.text})` : ""}${card.checkpointProgress?.total ? ` (${checkpointsCompleted(card.checkpointProgress)})` : ""}${activelyWorking ? " (an AI agent is working on it now)" : ""}${waitingForYou ? " (waiting for you)" : ""}${card.precedence ? ` (ranked by rule: ${card.precedence.name})` : ""}`}
      {...rest}
      // Touch (JAVA-59): a finger never hovers, so the press itself answers -- it lands in
      // `instant` (motion job 1) and the `.jd-motion` gates switch it off with the lift. A long
      // press is how a card is picked up on a phone, so it must not select text or open the
      // system's callout menu first; `touch-manipulation` drops the double-tap-zoom wait.
      className={`jd-motion group relative flex cursor-pointer touch-manipulation select-none flex-col gap-2 rounded-[var(--radius-jd-md)] bg-[color:var(--jd-raised)] p-3 shadow-[0_1px_2px_rgba(17,17,17,0.06),0_0_0_1px_var(--jd-line)] transition duration-[var(--jd-dur-base)] ease-[var(--ease-jd)] [-webkit-touch-callout:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--jd-focus)] active:scale-[0.98] active:duration-[var(--jd-dur-instant)] ${
        muted ? "opacity-40 grayscale hover:opacity-70" : "hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(17,17,17,0.06),0_0_0_1px_var(--jd-control-border),0_8px_20px_rgba(17,17,17,0.08)]"
      } ${className ?? ""}`}
    >
      {activelyWorking && <WorkingSnake radius={14} />}
      <div className="flex flex-row items-start justify-between gap-2">
        {/* The epic sits by the key on every face, compact included (JAVA-291): a sprint holds
            the children and never the epic (JAVA-290), so this is where the child says whose it is. */}
        <div className="flex min-w-0 flex-row items-center gap-2">
          <span className="shrink-0 font-[family-name:var(--font-jd-kicker)] text-xs uppercase tracking-widest text-[color:var(--jd-muted)]">
            {card.key}
          </span>
          {epic && <EpicBadge text={epic.text} identity={epic.identity} />}
          <EpicProgressBadge progress={card.checkpointProgress} />
        </div>
        <span title={priority.label} className="flex flex-row shrink-0 items-center gap-1" style={{ color: priority.color }}>
          <PriorityIcon size={compact ? 14 : 16} strokeWidth={2.5} aria-hidden="true" />
          <span className="sr-only">{priority.label} priority</span>
        </span>
      </div>

      <PrecedenceMark precedence={card.precedence} />

      {!compact && (
        <div className="flex flex-row items-center gap-1.5">
          <StatusShape status={card.status} className="size-4 shrink-0" title={status.label} />
          <span className="text-xs font-semibold" style={{ color: status.tone.ink }}>
            {status.label}
          </span>
        </div>
      )}

      <h3 className="m-0 line-clamp-2 text-pretty text-[13.5px] font-semibold leading-snug text-[color:var(--jd-ink)]">{card.title}</h3>

      {!compact && card.excerpt && (
        <p className="m-0 line-clamp-2 text-pretty text-xs leading-relaxed text-[color:var(--jd-muted)]">{card.excerpt}</p>
      )}

      <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
        <CategoryMarker category={card.category} />
        {!hideWho && <ExecutorMarker executor={card.executor} person={card.assignees[0]?.name} />}
      </div>

      {hasFlags && (
        <div className="flex flex-row flex-wrap items-center gap-1.5">
          {/* Never the border alone (`interface-psychology.md` #4): icon + text too. */}
          {activelyWorking && <WorkingNowMarker />}
          {waitingForYou && <WaitingForYouMarker />}
          {/* `blockedBy` holds only the blockers still open (finished ones are in `relatedBy`). */}
          <BlockedMarker blockedBy={card.blockedBy} />
          <WakeReasonMark reason={card.wakeReason} />
        </div>
      )}

      {!compact && (
        <div className="flex flex-col gap-1">
          <span className="flex flex-row items-center justify-between gap-2 text-xs text-[color:var(--jd-muted)]">
            <span className="tabular-nums">
              {logged.toFixed(2)}h / {hours(card.estimate)}h
            </span>
            {!hideWho && card.assignees.length > 0 && (
              <span className="truncate">
                {card.assignees[0]?.name}
                {card.assignees.length > 1 ? ` +${card.assignees.length - 1}` : ""}
              </span>
            )}
          </span>
          <span className="block h-1.5 overflow-hidden rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-bone)]">
            <span className="block h-full rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-ink)]/45" style={{ width: `${pct}%` }} />
          </span>
        </div>
      )}
      {compact && !hideWho && card.assignees.length > 0 && (
        <span className="truncate text-xs text-[color:var(--jd-muted)]">
          {card.assignees[0]?.name}
          {card.assignees.length > 1 ? ` +${card.assignees.length - 1}` : ""}
        </span>
      )}

      {/* JDB-226: "a subtle 'updated by Claude Code' marker using the activity actor." Only
          when the LAST write was an agent's -- a person editing after an agent's turn clears it,
          which is the point: it says who to credit for what's on screen right now. */}
      {!hideWho && card.updatedBy.kind === "agent" && (
        <span className="flex flex-row items-center gap-1 text-xs font-medium text-[color:var(--jd-muted)]">
          <Bot size={11} aria-hidden="true" />
          Updated by {card.updatedBy.agentName}
        </span>
      )}
    </article>
  );
});
