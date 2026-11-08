import type { Actor, DocPresence, DocPresencePerson, DocPresenceState } from "../../backlog/types";

const BEAT_SECONDS = 20;
const TTL_SECONDS = 30;

interface Entry {
  accountId: string;
  name: string;
  state: DocPresenceState;
  since: string;
}

/**
 * The mock backend's half of doc presence (JAVA-802, §8.19): who is on which page, kept in memory
 * as the real board does. Entries never expire here: a mock page is open exactly as long as the
 * test says. `beat`/`leave` are the caller's own; `seed`/`remove` are the test hooks standing in
 * for other people.
 */
export class MemoryDocPresence {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly announce: (projectId: string, path: string, actor: Actor) => void) {}

  private static key(projectId: string, path: string, client: string) {
    return `${projectId}\n${path}\n${client}`;
  }

  /** @returns whether someone arrived or changed state, the only beats worth telling the others. */
  private put(projectId: string, path: string, client: string, entry: Omit<Entry, "since">): boolean {
    const key = MemoryDocPresence.key(projectId, path, client);
    const existing = this.entries.get(key);
    if (existing && existing.accountId === entry.accountId && existing.state === entry.state) return false;
    this.entries.set(key, { ...entry, since: existing?.since ?? new Date().toISOString() });
    return true;
  }

  beat(projectId: string, path: string, client: string, state: DocPresenceState, who: Actor): DocPresence {
    const changed = this.put(projectId, path, client, { accountId: who.accountId, name: who.name, state });
    if (changed) this.announce(projectId, path, who);
    return this.view(projectId, path);
  }

  leave(projectId: string, path: string, client: string, who: Actor): void {
    if (this.entries.delete(MemoryDocPresence.key(projectId, path, client))) this.announce(projectId, path, who);
  }

  seed(projectId: string, path: string, person: { accountId: string; name: string; state: DocPresenceState }): void {
    const who: Actor = { kind: "person", accountId: person.accountId, name: person.name, agentName: null };
    if (this.put(projectId, path, `seed-${person.accountId}`, person)) this.announce(projectId, path, who);
  }

  remove(projectId: string, path: string, accountId: string): void {
    const key = MemoryDocPresence.key(projectId, path, `seed-${accountId}`);
    const entry = this.entries.get(key);
    if (!entry || !this.entries.delete(key)) return;
    this.announce(projectId, path, { kind: "person", accountId, name: entry.name, agentName: null });
  }

  view(projectId: string, path: string): DocPresence {
    const prefix = `${projectId}\n${path}\n`;
    const people = new Map<string, DocPresencePerson>();
    for (const [key, entry] of this.entries) {
      if (!key.startsWith(prefix)) continue;
      const known = people.get(entry.accountId);
      const state = known?.state === "editing" || entry.state === "editing" ? "editing" : "viewing";
      people.set(entry.accountId, {
        accountId: entry.accountId, name: entry.name, state, since: known?.since ?? entry.since, expiresInSeconds: TTL_SECONDS,
      });
    }
    return { path, beatSeconds: BEAT_SECONDS, present: [...people.values()] };
  }
}
