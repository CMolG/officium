import { ApiError } from "./api-error";
import { MAX_NOTE_LENGTH, type CardRequest, type RequestAnswer } from "./card-requests";
import type { Actor, Card, ChangeEvent } from "./types";

type Emit = (projectId: string, event: Omit<ChangeEvent, "projectId" | "at">) => void;

/**
 * The in-memory half of `cards.requestAction` / `cards.closeRequest` and the answer route
 * (JAVA-1122). One live request per card; every change emits `card.request`, like the server.
 * Kept out of `memory-repository.ts`, which may not grow.
 */
export class CardRequestStore {
  private readonly byProject = new Map<string, CardRequest[]>();
  private counter = 0;

  constructor(
    private readonly findCard: (projectId: string, keyOrId: string) => Card | undefined,
    private readonly emit: Emit,
  ) {}

  list(projectId: string): CardRequest[] {
    return (this.byProject.get(projectId) ?? []).filter((r) => r.status !== "closed").map((r) => ({ ...r }));
  }

  open(projectId: string, cardKey: string, input: { action: string; detail?: string; why?: string }, actor: Actor): CardRequest {
    const card = this.requireCard(projectId, cardKey);
    if (this.live(projectId, card.id)) throw new ApiError("request_already_open", "This card already has a request.", 409);
    const request: CardRequest = {
      id: `req-${++this.counter}`,
      projectId,
      cardId: card.id,
      cardKey: card.key,
      cardTitle: card.title,
      action: input.action.slice(0, 140),
      detail: input.detail ?? null,
      why: input.why ?? null,
      status: "open",
      createdBy: actor,
      createdAt: new Date().toISOString(),
      answeredBy: null,
      answeredAt: null,
      note: null,
      closedAt: null,
    };
    this.byProject.set(projectId, [...(this.byProject.get(projectId) ?? []), request]);
    this.changed(projectId, card, actor);
    return { ...request };
  }

  close(projectId: string, cardKey: string, actor: Actor): void {
    const card = this.requireCard(projectId, cardKey);
    const request = this.live(projectId, card.id);
    if (!request) return;
    request.status = "closed";
    request.closedAt = new Date().toISOString();
    this.changed(projectId, card, actor);
  }

  answer(projectId: string, requestId: string, answer: RequestAnswer, note: string | undefined, actor: Actor): CardRequest {
    const request = (this.byProject.get(projectId) ?? []).find((r) => r.id === requestId);
    if (!request) throw new ApiError("request_not_found", "That request does not exist.", 404);
    if (request.status !== "open") throw new ApiError("request_not_open", "This request was already answered.", 409);
    request.status = answer;
    request.answeredBy = actor;
    request.answeredAt = new Date().toISOString();
    request.note = note?.trim().slice(0, MAX_NOTE_LENGTH) || null;
    this.emit(projectId, { type: "card.request", cardId: request.cardId, cardKey: request.cardKey, actor });
    return { ...request };
  }

  private live(projectId: string, cardId: string) {
    return (this.byProject.get(projectId) ?? []).find((r) => r.cardId === cardId && r.status !== "closed");
  }

  private requireCard(projectId: string, keyOrId: string): Card {
    const card = this.findCard(projectId, keyOrId);
    if (!card) throw new Error("card_not_found");
    return card;
  }

  private changed(projectId: string, card: Card, actor: Actor) {
    this.emit(projectId, { type: "card.request", cardId: card.id, cardKey: card.key, actor });
  }
}
