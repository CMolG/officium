"use client";

import { useEffect, useRef, useState } from "react";
import { isHidden, onVisibilityChange } from "@javadaba/sdk/platform";

import type { BacklogRepository } from "../../backlog/repository";
import type { DocPresence, DocPresencePerson } from "../../backlog/types";
import { useCurrentAccountId } from "../../backlog/use-current-account";
import { onPageHide } from "../../presence/presence-env";

/** The server's `beatSeconds`: its TTL (30 s) is this plus 10 s of slack. */
const BEAT_MS = 20_000;

interface Seen {
  person: DocPresencePerson;
  /** When the entry lapses on this device without another answer: a dead tab drops out with no request. */
  until: number;
}

/** A random id per mounted page, so two tabs of one person are two entries on the server. */
function newClient(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b, i) => `${[4, 6, 8, 10].includes(i) ? "-" : ""}${b.toString(16).padStart(2, "0")}`).join("");
}

/**
 * Tells the project this person has the page open and returns the OTHER people on it (JAVA-802,
 * §8.19). Beats at mount, every `beatSeconds`, on a change of `editing` and on every reconnection;
 * leaves on unmount, when the tab hides (and beats again when it shows) and on `pagehide`. Re-reads
 * who is there when the server says someone arrived or left. Never lists the caller.
 */
export function useDocPresence(repository: BacklogRepository, projectId: string, path: string, editing: boolean): DocPresencePerson[] {
  const me = useCurrentAccountId();
  const [seen, setSeen] = useState<Seen[]>([]);
  const editingRef = useRef(editing);
  const beatNow = useRef<(() => void) | null>(null);

  useEffect(() => {
    editingRef.current = editing;
    beatNow.current?.();
  }, [editing]);

  useEffect(() => {
    const client = newClient();
    let stopped = false;
    const apply = (answer: DocPresence) => {
      if (stopped) return;
      const at = Date.now();
      setSeen(answer.present.map((person) => ({ person, until: at + person.expiresInSeconds * 1000 })));
    };
    const beat = () => {
      if (isHidden()) return;
      repository.beatDocPresence(projectId, path, client, editingRef.current ? "editing" : "viewing").then(apply, () => {
        // The next beat says it again; a failed one never needs to reach the person.
      });
    };
    const leave = () => {
      repository.leaveDocPresence(projectId, path, client).catch(() => {});
    };
    beatNow.current = beat;
    beat();
    const timer = setInterval(beat, BEAT_MS);
    const stopVisibility = onVisibilityChange((hidden) => (hidden ? leave() : beat()));
    const stopHide = onPageHide(leave);
    const stopLive = repository.subscribe(projectId, (event) => {
      if (event.type === "stream.ready" || (event.type === "doc.presence" && event.path === path)) beat();
    });
    return () => {
      stopped = true;
      beatNow.current = null;
      clearInterval(timer);
      stopVisibility();
      stopHide();
      stopLive();
      leave();
    };
  }, [repository, projectId, path]);

  // A dead tab stops beating, so its entry lapses here without waiting for another answer.
  useEffect(() => {
    if (seen.length === 0) return;
    const next = Math.min(...seen.map((s) => s.until));
    const timer = setTimeout(() => setSeen((all) => all.filter((s) => s.until > Date.now())), Math.max(next - Date.now(), 0) + 50);
    return () => clearTimeout(timer);
  }, [seen]);

  return seen.map((s) => s.person).filter((person) => person.accountId !== me);
}
