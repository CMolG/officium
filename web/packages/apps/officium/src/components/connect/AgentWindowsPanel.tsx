"use client";

import { useCallback, useEffect, useState } from "react";
import { isHidden, onVisibilityChange } from "@javadaba/sdk/platform";
import { Panel, Text } from "@javadaba/ui";

import { getBacklogRepository } from "../../lib/backlog/get-repository";
import type { AgentWindow } from "../../lib/backlog/types";
import { accountLimits, NEAR_FULL } from "../backlog/QueueToWindow";
import { AgentWindowCard, WINDOW_ORDER } from "./AgentWindowCard";

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");

/** A window's state moves on its own (its waiter connects, a card is handed over): re-read it
 *  this often while the page is visible, never while it is hidden. */
const REFRESH_MS = 10_000;

/**
 * JAVA-561 (officium-api.md §4.3): your open Claude Code windows, each with the cards queued into
 * it, and how to turn a window on. Only yours: nobody else's windows are ever listed or reachable.
 * JAVA-562: what each window's status line reports (context, model, cost) and whether it waits on
 * you, so the window to queue into is chosen knowing; the account's limits are drawn once.
 */
export function AgentWindowsPanel() {
  const repository = getBacklogRepository();
  const [windows, setWindows] = useState<AgentWindow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(
    () =>
      repository.listAgentWindows().then(
        (list) => {
          setWindows(list);
          setError(null);
        },
        (err: unknown) => setError(messageOf(err)),
      ),
    [repository],
  );

  useEffect(() => {
    void load();
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer === null && !isHidden()) timer = setInterval(() => void load(), REFRESH_MS);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    start();
    const unsubscribe = onVisibilityChange((hidden) => {
      if (hidden) stop();
      else {
        void load();
        start();
      }
    });
    return () => {
      stop();
      unsubscribe();
    };
  }, [load]);

  async function unqueue(projectId: string, cardKey: string) {
    setBusy(cardKey);
    try {
      await repository.unqueueCard(projectId, cardKey);
      await load();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(null);
    }
  }

  const limits = windows ? accountLimits(windows) : null;
  const limitParts = limits
    ? [
        limits.fiveHourUsedPercent != null ? `5-hour limit ${Math.round(limits.fiveHourUsedPercent)}% used` : null,
        limits.sevenDayUsedPercent != null ? `weekly limit ${Math.round(limits.sevenDayUsedPercent)}% used` : null,
      ].filter(Boolean)
    : [];

  return (
    <Panel as="section" material="plain" radius="lg" className="flex flex-col gap-3 p-4" aria-labelledby="windows-heading">
      <h3 id="windows-heading" className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
        Your agent windows
      </h3>
      <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-ink)]">
        Queue a card from the board into one of your open Claude Code windows and it starts there on its own: an
        idle window within seconds, a busy one after its current card. A window turns on when its project has
        Officium&apos;s hooks installed from Fluxor&apos;s market and the heartbeat token above is saved on that
        machine. Only you see your windows, and only you can queue into them.
      </p>

      {windows === null && !error && <p className="text-sm text-[color:var(--jd-muted)]">Looking for your windows…</p>}

      {windows !== null && windows.length === 0 && (
        <p className="text-sm text-[color:var(--jd-muted)]">No window of yours is open right now.</p>
      )}

      {limitParts.length > 0 && (
        <Text className="text-xs">
          This account: {limitParts.join(" · ")}
          {(limits?.fiveHourUsedPercent ?? 0) >= NEAR_FULL ? ", nearly spent." : "."}
        </Text>
      )}

      {windows !== null && windows.length > 0 && (
        <ul aria-label="Your agent windows" className="m-0 flex list-none flex-col gap-2 p-0">
          {[...windows]
            .sort((x, y) => WINDOW_ORDER.indexOf(x.state) - WINDOW_ORDER.indexOf(y.state))
            .map((w) => (
              <AgentWindowCard key={w.sessionId} agentWindow={w} busy={busy} onUnqueue={(projectId, cardKey) => void unqueue(projectId, cardKey)} />
            ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Panel>
  );
}
