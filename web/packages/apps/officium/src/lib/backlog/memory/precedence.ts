import type { CardActivity } from "../precedence-repository";
import { MemoryExecutionMode } from "./execution-mode";

/** A card's precedence history in memory: the twin runs no matcher, so only the lines a test planted exist. */
export class MemoryPrecedence extends MemoryExecutionMode {
  private activity = new Map<string, CardActivity[]>();

  async listCardPrecedenceActivity(projectId: string, cardId: string): Promise<CardActivity[]> {
    const card = [...this.requireRecord(projectId).cards.values()].find((found) => found.id === cardId || found.key === cardId);
    return card ? (this.activity.get(`${projectId}:${card.key}`) ?? []) : [];
  }

  /** Test hook's lever: the lines a rule wrote on a card's history. */
  setCardPrecedenceActivity(projectId: string, cardKey: string, lines: CardActivity[]) {
    this.activity.set(`${projectId}:${cardKey}`, lines);
  }
}
