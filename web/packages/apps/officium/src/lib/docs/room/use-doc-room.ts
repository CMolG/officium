"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { PageCollaboration } from "@javadaba/rich-text";
import { apiUrl, currentOrigin } from "@javadaba/sdk/platform";

import type { SentFrame } from "./frames";
import { DocRoomClient, type RoomState } from "./room-client";

const OFF: RoomState = { status: "unavailable", role: "observer", seed: false };
const never = () => () => {};

/** `wss://…/api/officium/v1/projects/{id}/doc-rooms/{pageId}`, on the origin the app is served from. */
export function roomUrl(projectId: string, pageId: string): string {
  const url = new URL(`${apiUrl("/api/officium/v1")}/projects/${projectId}/doc-rooms/${pageId}`, currentOrigin());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export interface DocRoom {
  /** What the editor binds to; undefined when the page is not co-edited (today's single-writer path). */
  collaboration: PageCollaboration | undefined;
  /** The room is in use: the editor waits for it, and autosave answers to it. */
  active: boolean;
  /** The room is up and the page is in it, or live editing is unavailable: the editor may mount. */
  settled: boolean;
  /** The room is up and the page is in it: an observer swaps its reading view for the live page. */
  live: boolean;
  unavailable: boolean;
  saver: boolean;
  /** This client was granted the seed: the host writes the page into the room, then calls {@link seeded}. */
  seed: boolean;
  /** The room's epoch: the `editSession` of the saver's writes. */
  epoch: string | null;
  /** The title as the room holds it; null outside a room. */
  title: { get: () => string | undefined; set: (title: string) => void; observe: (run: (title: string) => void) => () => void } | null;
  /** The room's merge notices and outside writes (JAVA-1477); null outside a room. */
  frames: { listen: (run: (frame: SentFrame) => void) => () => void; send: (frame: SentFrame) => void } | null;
  /** Run when the room is found dead, before a fresh one replaces it: the host keeps what is unsaved (JAVA-1477). */
  staleHandler: RefObject<(() => void) | null>;
  seeded: () => void;
  /** After a save: the saver collapses the room's log. */
  snapshot: () => void;
}

/**
 * Joins a documentation page's room while it is edited (JAVA-803, ADR 0024). When the room cannot be
 * had -- signed out, no socket, a refused upgrade -- {@link DocRoom.unavailable} says so and the page
 * saves as it always did. A client of a dead epoch rejoins on a fresh document.
 */
export function useDocRoom({ enabled, projectId, pageId, name, color, accountId }: {
  enabled: boolean;
  projectId: string;
  pageId: string;
  name: string;
  color: string;
  accountId: string;
}): DocRoom {
  const [generation, setGeneration] = useState(0);
  const staleHandler = useRef<(() => void) | null>(null);
  const [settledFor, setSettledFor] = useState<DocRoomClient | null>(null);
  const client = useMemo(
    () => (enabled ? new DocRoomClient({ url: roomUrl(projectId, pageId), open: (url) => new WebSocket(url) }) : null),
    // `generation` is a new client on purpose: a stale room needs a fresh document.
    [enabled, projectId, pageId, generation], // eslint-disable-line react-hooks/exhaustive-deps
  );
  useEffect(() => {
    if (!client) return;
    const stop = client.subscribe(() => {
      const { status, seed } = client.state;
      if (status === "stale") {
        staleHandler.current?.();
        setGeneration((g) => g + 1);
      }
      else if (status === "synced" || seed) setSettledFor(client);
    });
    client.connect();
    return () => {
      stop();
      client.disconnect();
    };
  }, [client]);

  const state = useSyncExternalStore(client ? client.subscribe : never, () => client?.state ?? OFF, () => OFF);
  const everSettled = settledFor === client;
  const collaboration = useMemo(
    () => (client ? { doc: client.doc, awareness: client.awareness, user: { name, color, accountId } } : undefined),
    [client, name, color, accountId],
  );
  const unavailable = !client || state.status === "unavailable";
  return {
    // A room lost after the editor bound to it keeps the binding; one never had leaves today's editor.
    collaboration: unavailable && !everSettled ? undefined : collaboration,
    active: !unavailable,
    settled: !enabled || unavailable || everSettled,
    live: everSettled && !unavailable,
    unavailable,
    saver: state.role === "saver",
    seed: state.seed,
    epoch: client?.epoch ?? null,
    title: client && !unavailable ? { get: () => client.title, set: (title) => client.setTitle(title), observe: (run) => client.onTitle(run) } : null,
    frames: client && !unavailable ? { listen: (run) => client.onFrame(run), send: (frame) => client.sendFrame(frame) } : null,
    staleHandler,
    seeded: () => client?.seeded(),
    snapshot: () => client?.snapshot(),
  };
}
