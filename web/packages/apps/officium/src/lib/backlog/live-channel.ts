import { isHidden, onVisibilityChange } from "@javadaba/sdk/platform";

import type { ChangeEvent, ChangeEventType, LiveStatus } from "./types";

/** Reopening a stream the browser gave up on: the ecosystem's capped exponential backoff with
 *  jitter (sonus's `fetch-with-retry.ts` is the model, `.harness/rules/architecture.md`). */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15_000;
/** How long a dropped stream may take to come back before the board says it is reconnecting. */
const RECONNECTING_GRACE_MS = 8_000;
/** A listener that joined this recently loaded what it shows in the same effect pass, so the
 *  stream's first `ready` (the stream just opened) does not make it read again (JAVA-1646). */
const FIRST_READY_WINDOW_MS = 3_000;

export interface LiveChannel {
  add(listener: (event: ChangeEvent) => void, onStatus?: (status: LiveStatus) => void): () => void;
}

/**
 * The project's `EventSource`, shared by every subscriber and closed with the last one. A
 * subscriber that joins an open stream gets no `stream.ready` -- it loads what it shows after
 * subscribing, so nothing committed since can be missed ("reconnect = refetch") -- but it is told
 * the stream's current status, so a stream already down reads as down on the new surface too.
 * The first `stream.ready` of the page is the stream opening, not a reconnect: it skips the
 * listeners that joined less than `FIRST_READY_WINDOW_MS` before it, which loaded just then.
 */
export function openChannel(url: string, projectId: string, onEmpty: () => void): LiveChannel {
  // Each listener with the time it joined (`performance.now()`, monotonic).
  const listeners = new Map<(event: ChangeEvent) => void, number>();
  const statusListeners = new Set<(status: LiveStatus) => void>();
  let status: LiveStatus | null = null;
  const fanOut = (event: ChangeEvent) => {
    for (const listener of [...listeners.keys()]) listener(event);
  };
  const report = (next: LiveStatus) => {
    status = next;
    for (const onStatus of [...statusListeners]) onStatus(next);
  };

  // The vocabulary this repository knows how to name (officium-api.md §4 plus the two extra
  // project.* types found in the real services -- see the `ChangeEventType` doc comment).
  const types: ChangeEventType[] = [
    "card.created", "card.updated", "card.moved", "card.deleted", "card.executor", "card.link",
    "card.comment", "card.time", "card.attachment", "card.development", "card.working", "card.queue", "card.request", "summons", "project.updated", "project.archived",
    "project.unarchived", "project.machine", "project.roleMatrix", "member.changed", "sprint.changed",
    "doc.changed", "doc.comment", "doc.presence", "changelog.changed", "tests.changed", "autoloop.changed",
  ];

  function onNamed(type: ChangeEventType) {
    return (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data) as Omit<ChangeEvent, "type">;
        fanOut({ type, ...data });
      } catch {
        // A malformed frame is not worth crashing the subscription over; the next real event
        // (or the 15s heartbeat's reconnect, if the connection actually dropped) recovers.
      }
    };
  }

  let source: EventSource | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let slow: ReturnType<typeof setTimeout> | null = null;
  let failures = 0;
  let stopped = false;
  // Until a `ready` or an `error` has come: the page's first connection, not a reconnect.
  let firstConnection = true;

  const connect = () => {
    retry = null;
    const stream = new EventSource(url, { withCredentials: true });
    source = stream;
    for (const type of types) stream.addEventListener(type, onNamed(type));
    // "ready" carries no card/version -- it is the "reconnect = refetch" signal itself, not a
    // change. Fired once per (re)connection, first frame every time, per the SSE resource.
    stream.addEventListener("ready", () => {
      const first = firstConnection;
      firstConnection = false;
      failures = 0;
      if (slow !== null) clearTimeout(slow);
      slow = null;
      report("live");
      const now = performance.now();
      const event: ChangeEvent = { type: "stream.ready", projectId, actor: { kind: "person", accountId: "", name: "", agentName: null }, at: new Date().toISOString() };
      for (const [listener, joined] of [...listeners]) {
        if (first && now - joined < FIRST_READY_WINDOW_MS) continue;
        listener(event);
      }
    });
    stream.addEventListener("error", () => {
      // A failed connect before the first `ready` is a gap too: its retry's `ready` refetches.
      firstConnection = false;
      // The edge closes every response at 60s (Traefik's `writeTimeout`), this stream included,
      // and the browser reopens it within a few seconds: a drop is routine, not news. Only one
      // that is not back within the grace says so -- announcing each one made the board jump
      // every minute (JAVA-45).
      if (slow === null) slow = setTimeout(() => report("reconnecting"), RECONNECTING_GRACE_MS);
      // CONNECTING: the connection dropped and the browser is already reopening it. CLOSED: the
      // browser gave up for good, which it does on ANY answer that is not a 200 stream -- the
      // 502 Traefik returns while the API redeploys, a 401 once the session expired. Until
      // 2026-09-23 nothing reopened it, so every open board went silently stale on every deploy.
      if (stream.readyState === EventSource.CLOSED) scheduleReconnect();
    });
  };

  // None of it while the tab is hidden: a background tab reconnects when it is looked at again.
  const scheduleReconnect = () => {
    source?.close();
    source = null;
    if (stopped || retry !== null || isHidden()) return;
    const backoff = RECONNECT_BASE_MS * 2 ** failures + Math.random() * (RECONNECT_BASE_MS / 2);
    failures += 1;
    retry = setTimeout(connect, Math.min(backoff, RECONNECT_MAX_MS));
  };

  const stopVisibility = onVisibilityChange((hidden) => {
    if (!hidden && !stopped && source === null && retry === null) connect();
  });

  connect();

  return {
    add(listener, onStatus) {
      // Wrapped, so two subscriptions passing the same function each keep their own entry.
      const own = (event: ChangeEvent) => listener(event);
      const ownStatus = onStatus && ((next: LiveStatus) => onStatus(next));
      listeners.set(own, performance.now());
      if (ownStatus) {
        statusListeners.add(ownStatus);
        if (status !== null) ownStatus(status);
      }
      return () => {
        listeners.delete(own);
        if (ownStatus) statusListeners.delete(ownStatus);
        // `stopped`: a second call must not close the map entry of a newer channel for this project.
        if (stopped || listeners.size > 0) return;
        stopped = true;
        if (retry !== null) clearTimeout(retry);
        if (slow !== null) clearTimeout(slow);
        source?.close();
        stopVisibility();
        onEmpty();
      };
    },
  };
}
