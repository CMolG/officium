import type { Page } from "../types";
import type { CardActivity } from "../precedence-repository";
import { ApiRoles } from "./roles";

/** The lines a precedence rule wrote on a card, over the project's activity feed (JAVA-1686, JAVA-1728). */
export class ApiPrecedence extends ApiRoles {
  async listCardPrecedenceActivity(projectId: string, cardId: string): Promise<CardActivity[]> {
    const page = await this.request<Page<CardActivity>>(`/projects/${projectId}/activity?cardId=${cardId}&limit=50`);
    return page.items.filter((entry) => entry.operation === "card.precedence");
  }
}
