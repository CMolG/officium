"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isHidden, onVisibilityChange } from "@javadaba/sdk/platform";

import { ApiError } from "../backlog/api-error";
import { getAutoloopClient } from "./autoloop-client";
import type { AutoloopStatus } from "./autoloop-types";

/** A loop that stops beating sends no event: the status is read again on this clock while the tab is seen. */
const POLL_MS = 30_000;

export interface AutoloopControl {
  /** Null until the first read answers. */
  status: AutoloopStatus | null;
  /** The last read failed: the button says so instead of guessing a state. */
  failed: boolean;
  busy: boolean;
  problem: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

/**
 * The project's autoloop as its Start/Stop button needs it (card://JAVA-1528): read on mount, when the server
 * says a loop changed, every 30 s while the tab is visible (offline is only time passing) and when it is looked
 * at again (`enabled` false reads nothing, for a Theater scene). Start and stop queue the order the loop's next beat takes.
 */
export function useAutoloop(projectId: string, enabled = true): AutoloopControl {
  const [status, setStatus] = useState<AutoloopStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  const refresh = useCallback(() => {
    const ticket = ++latest.current;
    getAutoloopClient()
      .status(projectId)
      .then((next) => {
        if (ticket !== latest.current) return;
        setStatus(next);
        setFailed(false);
      })
      .catch(() => {
        // The next event, poll or look at the tab tries again; meanwhile the button says it could not read.
        if (ticket === latest.current) setFailed(true);
      });
  }, [projectId]);

  useEffect(() => {
    if (!enabled) return;
    queueMicrotask(refresh);
    // A hidden tab reads nothing: looking at it again reads once (below).
    const stopStream = getAutoloopClient().subscribe(projectId, () => {
      if (!isHidden()) refresh();
    });
    let timer: ReturnType<typeof setInterval> | null = null;
    const arm = (hidden: boolean) => {
      if (timer !== null) clearInterval(timer);
      timer = hidden ? null : setInterval(refresh, POLL_MS);
    };
    arm(isHidden());
    const stopVisible = onVisibilityChange((hidden) => {
      arm(hidden);
      if (!hidden) refresh();
    });
    return () => {
      stopStream();
      stopVisible();
      if (timer !== null) clearInterval(timer);
    };
  }, [projectId, refresh, enabled]);

  const send = useCallback(
    async (command: "start" | "stop") => {
      setBusy(true);
      setProblem(null);
      try {
        const client = getAutoloopClient();
        const next = await (command === "start" ? client.start(projectId) : client.stop(projectId));
        ++latest.current;
        setStatus(next);
      } catch (error) {
        setProblem(error instanceof ApiError ? error.message : "The order did not reach Officium. Try again.");
        refresh();
      } finally {
        setBusy(false);
      }
    },
    [projectId, refresh],
  );

  return { status, failed, busy, problem, start: () => send("start"), stop: () => send("stop") };
}
