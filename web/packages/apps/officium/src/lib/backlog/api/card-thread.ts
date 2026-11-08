import type { Card, CardDetail, VersionConflict, WriteResult } from "../types";
import type { RawComment } from "./core";
import { ApiCardWork } from "./card-work";

export class ApiCardThread extends ApiCardWork {
  async deleteCard(projectId: string, cardId: string, expectedVersion: number): Promise<void | VersionConflict<Card>> {
    return this.requestVersioned<void>(`/projects/${projectId}/cards/${cardId}?expectedVersion=${expectedVersion}`, {
      method: "DELETE",
    }) as Promise<void | VersionConflict<Card>>;
  }

  async linkCard(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; type: "related" | "blocks"; target: string },
  ): Promise<WriteResult<Card>> {
    return this.requestVersioned<Card>(`/projects/${projectId}/cards/${cardId}/links`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async unlinkCard(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; type: "related" | "blocks"; target: string },
  ): Promise<WriteResult<Card>> {
    return this.requestVersioned<Card>(`/projects/${projectId}/cards/${cardId}/links`, {
      method: "DELETE",
      body: JSON.stringify(input),
    });
  }

  async addComment(projectId: string, cardId: string, text: string, parentId?: string): Promise<CardDetail> {
    await this.request<RawComment>(`/projects/${projectId}/cards/${cardId}/comments`, {
      method: "POST",
      body: JSON.stringify({ text, parentId }),
    });
    return this.getCard(projectId, cardId); // see `ApiBacklogRepository`'s doc, note 3
  }
}
