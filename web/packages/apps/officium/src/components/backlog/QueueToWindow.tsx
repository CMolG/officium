"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Select, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { AgentWindow, AgentWindowState, AgentWindowTelemetry } from "../../lib/backlog/types";
import { configurationPath } from "../../lib/configuration/places";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/** A window as people know it: the folder it runs in, then the computer. */
export function windowName(window: AgentWindow): string {
  return window.label ?? window.machine ?? `Window ${window.sessionId.slice(0, 8)}`;
}

/** Said in words, never by colour alone (interface-psychology #4). */
export const WINDOW_STATE: Record<AgentWindowState, { label: string; hint: string }> = {
  blocked: { label: "Waiting on you", hint: "takes it once you answer its prompt" },
  working: { label: "Working", hint: "takes it after its current card" },
  idle: { label: "Idle", hint: "starts it within seconds" },
  offline: { label: "Offline", hint: "takes it when its waiter is back" },
};

/** At or past this share of a window's context, or of the account's 5-hour limit, queueing into it
 *  earns a warning (JAVA-562): the card may be cut short by a compaction or by the limit. */
export const NEAR_FULL = 85;

/** What the window's prompt is waiting for, in words. */
export const BLOCKED_REASON: Record<string, string> = {
  permission_prompt: "It is asking for a permission.",
  elicitation_dialog: "It is asking you a question.",
};

/** "Opus 5.5 · high effort · fast", from what the status line reported. */
export function modelLine(t: AgentWindowTelemetry): string | null {
  const parts = [t.modelName ?? t.modelId, t.effort ? `${t.effort} effort` : null, t.fastMode ? "fast" : null];
  const line = parts.filter(Boolean).join(" · ");
  return line === "" ? null : line;
}

/** The account's limits are the same in every window: the freshest report that carries them. */
export function accountLimits(windows: AgentWindow[]): AgentWindowTelemetry | null {
  const reports = windows
    .map((w) => w.telemetry)
    .filter((t): t is AgentWindowTelemetry => t != null && (t.fiveHourUsedPercent != null || t.sevenDayUsedPercent != null));
  return reports.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))[0] ?? null;
}

const clock = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null;

/** Why a card queued into this window may not get finished there, in words. */
export function windowWarnings(window: AgentWindow, limits: AgentWindowTelemetry | null): string[] {
  const warnings: string[] = [];
  const context = window.telemetry?.contextUsedPercent;
  if (context != null && context >= NEAR_FULL) {
    warnings.push(`Its context is ${Math.round(context)}% full, so it may compact in the middle of the card.`);
  }
  const fiveHour = limits?.fiveHourUsedPercent;
  if (fiveHour != null && fiveHour >= NEAR_FULL) {
    const resets = clock(limits?.fiveHourResetsAt);
    warnings.push(
      `Your 5-hour limit is ${Math.round(fiveHour)}% used${resets ? ` until ${resets}` : ""}, so the card may stop before it is done.`,
    );
  }
  return warnings;
}

/**
 * JAVA-561 (officium-api.md §4.3): "work this next in that window" -- queue the card into one of
 * YOUR open Claude Code windows. Only yours are ever listed; the window's waiter is what picks it up.
 */
export function QueueToWindow({
  projectId,
  cardId,
  cardKey,
  repository,
}: {
  projectId: string;
  cardId: string;
  cardKey: string;
  repository: BacklogRepository;
}) {
  const [windows, setWindows] = useState<AgentWindow[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () => repository.listAgentWindows().then(setWindows, (err: unknown) => setError(messageOf(err))),
    [repository],
  );

  useEffect(() => {
    void load();
    return repository.subscribe(projectId, (event) => {
      if (event.type === "card.queue" && event.cardId === cardId) void load();
    });
  }, [repository, projectId, cardId, load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }

  const queuedIn = windows?.find((w) => w.queue.some((entry) => entry.cardId === cardId));
  const picked = windows?.find((w) => w.sessionId === chosen);
  const warnings = picked && windows ? windowWarnings(picked, accountLimits(windows)) : [];
  const entry = queuedIn?.queue.find((e) => e.cardId === cardId);
  const place = queuedIn && entry ? queuedIn.queue.indexOf(entry) + 1 : 0;

  return (
    <section aria-labelledby="queue-window-heading" className="flex flex-col gap-2">
      <h3 id="queue-window-heading" className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">
        Work it in a window
      </h3>

      {windows === null && !error && <p className="text-xs text-[color:var(--jd-muted)]">Looking for your agent windows…</p>}

      {windows !== null && windows.length === 0 && (
        <p className="text-xs text-[color:var(--jd-muted)]">
          <Text>No agent window of yours is open. </Text>
          <Link href={configurationPath("integrations", projectId)} className="underline underline-offset-4">
            <Text>Turn one on under Integrations</Text>
          </Link>
          <Text>.</Text>
        </p>
      )}

      {queuedIn && entry && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {entry.delivered
              ? `Being handed to ${windowName(queuedIn)} now.`
              : `Queued in ${windowName(queuedIn)}, ${place === 1 ? "next in line" : `number ${place} in line`}.`}
          </p>
          <Button
            type="button"
            register="ui"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => repository.unqueueCard(projectId, cardKey))}
          >
            <span>Remove from the queue</span>
          </Button>
        </div>
      )}

      {windows !== null && windows.length > 0 && !queuedIn && (
        <div className="flex flex-col gap-2">
          <Select
            aria-label="Agent window"
            placeholder="Choose one of your windows"
            value={chosen}
            onChange={setChosen}
            options={windows.map((w) => ({
              value: w.sessionId,
              label: windowName(w),
              description: `${WINDOW_STATE[w.state].label}: ${WINDOW_STATE[w.state].hint}`,
            }))}
          />
          {warnings.length > 0 && (
            <ul aria-label="Before you queue" className="flex flex-col gap-1">
              {warnings.map((warning) => (
                <li key={warning} className="text-xs">
                  <Text>{warning}</Text>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            register="ui"
            size="sm"
            disabled={busy || chosen === null}
            onClick={() => chosen && void run(() => repository.queueCard(projectId, cardKey, chosen))}
          >
            <span>{busy ? "Queueing…" : chosen === null ? "Choose a window first" : `Queue ${cardKey}`}</span>
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
