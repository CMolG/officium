import { publishHooks } from "./summons-env";
import { getSharedBacklogRepository } from "../backlog/memory-backend";
import type { Summons, SummonsClient, SummonsItem } from "./summons";

const SNOOZE_MS = 15 * 60_000;

/** What an e2e spec names: a card that has an open request, or an open form. */
export interface SimulatedRef {
  kind: "form" | "request";
  cardKey: string;
}

/** What an e2e spec drives, and reads back of what the page did. */
export interface SummonsHooks {
  send(projectId: string, refs: SimulatedRef[]): void;
  shown: { summonsId: string; seen: boolean }[];
  snoozed: string[];
}

interface Round {
  id: string;
  projectId: string;
  round: number;
  refs: SimulatedRef[];
  snoozedUntil: number | null;
}

/**
 * The memory build's stand-in for the summons endpoints (JAVA-1145). Pending is re-read from the
 * memory repository on every list, so answering a request or a form drops its item exactly as the
 * server's pending set does. The server's own rules are `OfficiumSummonsTest` and `SummonsServiceTest`.
 */
export function createMemorySummonsClient(): SummonsClient {
  const repository = getSharedBacklogRepository();
  const listeners = new Set<() => void>();
  const rounds = new Map<string, Round>();
  const hooks: SummonsHooks = {
    shown: [],
    snoozed: [],
    send(projectId, refs) {
      const previous = rounds.get(projectId);
      rounds.set(projectId, {
        id: previous?.id ?? `summons-${projectId}`,
        projectId,
        round: (previous?.round ?? 0) + 1,
        refs,
        snoozedUntil: null,
      });
      for (const notify of [...listeners]) notify();
    },
  };
  publishHooks(hooks);

  async function pending(round: Round): Promise<SummonsItem[]> {
    const requests = await repository.listRequests(round.projectId);
    const items: SummonsItem[] = [];
    for (const ref of round.refs) {
      const card = await repository.getCard(round.projectId, ref.cardKey);
      if (ref.kind === "request") {
        const request = requests.find((r) => r.cardKey === ref.cardKey && r.status === "open");
        if (request) items.push({ id: `request:${request.id}`, kind: "request", cardId: card.id, cardKey: card.key, cardTitle: card.title, unblocks: card.key, requestId: request.id, action: request.action, detail: request.detail });
      } else if (card.form?.state === "open") {
        items.push({ id: `form:${card.id}`, kind: "form", cardId: card.id, cardKey: card.key, cardTitle: card.title, unblocks: null, requestId: null, action: null, detail: null });
      }
    }
    return items;
  }

  return {
    async list() {
      const out: Summons[] = [];
      for (const round of rounds.values()) {
        out.push({
          id: round.id,
          projectId: round.projectId,
          round: round.round,
          items: await pending(round),
          summonedAt: new Date().toISOString(),
          delivered: true,
          shownAt: null,
          seenAt: null,
          snoozedUntil: round.snoozedUntil === null ? null : new Date(round.snoozedUntil).toISOString(),
          canAnswer: true,
        });
      }
      return out;
    },
    async shown(summonsId, seen) {
      hooks.shown.push({ summonsId, seen });
    },
    async snooze(summonsId) {
      hooks.snoozed.push(summonsId);
      for (const round of rounds.values()) if (round.id === summonsId) round.snoozedUntil = Date.now() + SNOOZE_MS;
    },
    subscribe(onChange) {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
  };
}
