import type { Assignee, Card, Executor, WriteResult } from "../types";
import { ApiCardReads } from "./card-reads";
import type { MoveInput } from "../review-return-types";

export class ApiCardWrites extends ApiCardReads {
  async createCard(
    projectId: string,
    input: {
      title: string;
      description?: string;
      actionPlan?: string;
      status?: Card["status"];
      priority?: Card["priority"];
      executor?: Executor;
      category?: Card["category"];
      signals?: Card["signals"];
      subtype?: Card["subtype"];
      estimate?: number;
      epic?: string | null;
      tags?: string[];
      assignees?: Assignee[];
      sprintId?: string | null;
    },
  ): Promise<Card> {
    return this.request<Card>(`/projects/${projectId}/cards`, { method: "POST", body: JSON.stringify(input) });
  }

  async updateCard(
    projectId: string,
    cardId: string,
    input: {
      expectedVersion: number;
      title?: string;
      description?: string;
      actionPlan?: string;
      priority?: Card["priority"];
      category?: Card["category"];
      signals?: Card["signals"];
      subtype?: Card["subtype"];
      estimate?: number;
      epic?: string | null;
      tags?: string[];
    },
  ): Promise<WriteResult<Card>> {
    // On the wire a null field means "leave it", so taking the category away is spelled "".
    const body = input.category === null ? { ...input, category: "" } : input;
    return this.requestVersioned<Card>(`/projects/${projectId}/cards/${cardId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  async moveCard(
    projectId: string,
    cardId: string,
    input: MoveInput,
  ): Promise<WriteResult<Card>> {
    return this.requestVersioned<Card>(`/projects/${projectId}/cards/${cardId}/move`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
}
