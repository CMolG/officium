"use client";

import { Bot, X } from "lucide-react";

import { Badge, IconButton, Note, Progress, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import type { AgentWindow, AgentWindowState } from "../../lib/backlog/types";
import { cardPath } from "../../lib/backlog/search-links";
import { BLOCKED_REASON, NEAR_FULL, WINDOW_STATE, modelLine, windowName } from "../backlog/QueueToWindow";

/** Waiting on you carries the warning, working the accent, the rest are quiet; the word and the shape say it first (Cfg-Integrations, "Reading the states"). */
const STATE_TONE: Record<AgentWindowState, "warning" | "info" | "neutral"> = {
  blocked: "warning",
  working: "info",
  idle: "neutral",
  offline: "neutral",
};

/** The order the windows list in: what waits on the person first, then what works, idles, and is away. */
export const WINDOW_ORDER: readonly AgentWindowState[] = ["blocked", "working", "idle", "offline"];

/**
 * One of the person's open agent windows (Cfg-Integrations, "Every window, and what it waits on"): its name and computer, its
 * state in words, why it is blocked, its card, cost, model, how full its context is, and its queue.
 */
export function AgentWindowCard({ agentWindow: w, busy, onUnqueue }: { agentWindow: AgentWindow; busy: string | null; onUnqueue: (projectId: string, cardKey: string) => void }) {
  const name = windowName(w);
  const model = w.telemetry ? modelLine(w.telemetry) : null;
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-jd-lg)] bg-[color:var(--jd-card)] p-4" data-state={w.state}>
      <div className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-row items-center gap-3">
          <span aria-hidden="true" className="flex size-9 shrink-0 flex-row items-center justify-center rounded-full bg-[color:var(--jd-raised)]">
            <Bot size={16} />
          </span>
          <div className="flex min-w-0 flex-col">
            <Text className="truncate font-semibold">{name}</Text>
            {w.machine && w.machine !== name && <Text className="text-xs text-[color:var(--jd-muted)]">on {w.machine}</Text>}
          </div>
        </div>
        <Badge register="chip" tone={STATE_TONE[w.state]} fill="subtle" size="sm">
          {WINDOW_STATE[w.state].label}
        </Badge>
      </div>
      {w.state === "blocked" && (
        <Note tone="warning">
          <span>{BLOCKED_REASON[w.blockedReason ?? ""] ?? "It is waiting at a prompt."} Answer it in that window.</span>
        </Note>
      )}
      <Text className="text-xs text-[color:var(--jd-muted)]">
        {w.currentCard ? (
          <>
            On{" "}
            <Link href={cardPath(w.currentCard.projectId, w.currentCard.cardKey)} className="font-mono font-medium underline underline-offset-4">
              {w.currentCard.cardKey}
            </Link>
            .{" "}
          </>
        ) : null}
        {w.cardsWorked === 1 ? "1 card worked" : `${w.cardsWorked} cards worked`}
        {w.telemetry?.costUsd != null ? ` · $${w.telemetry.costUsd.toFixed(2)} spent` : ""}
      </Text>
      {model && <Text className="text-xs">{model}</Text>}
      {w.telemetry?.contextUsedPercent != null && (
        <div className="flex flex-row items-center gap-2">
          <Progress value={w.telemetry.contextUsedPercent} aria-label={`Context used in ${name}`} className="max-w-48" />
          <Text className="shrink-0 text-xs">
            Context {Math.round(w.telemetry.contextUsedPercent)}% used
            {w.telemetry.contextUsedPercent >= NEAR_FULL ? ", nearly full" : ""}
          </Text>
        </div>
      )}
      {w.queue.length === 0 ? (
        <Text className="text-xs text-[color:var(--jd-muted)]">Nothing queued.</Text>
      ) : (
        <ol aria-label={`Queued in ${name}`} className="m-0 flex list-none flex-col gap-1 p-0">
          {w.queue.map((entry, index) => (
            <li key={entry.cardId} className="flex min-h-11 flex-row items-center gap-2">
              <Text className="min-w-0 flex-1 font-mono text-xs">
                {index + 1}. {entry.cardKey}
                {entry.delivered ? " (being handed over)" : ""}
              </Text>
              <IconButton aria-label={`Remove ${entry.cardKey}`} disabled={busy === entry.cardKey} onClick={() => onUnqueue(entry.projectId, entry.cardKey)}>
                <X size={14} aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}
