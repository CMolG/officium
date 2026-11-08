import type { Card, CardChanges, CardDetail, CardQuery, Page } from "../types";
import { mapComment, type RawComment } from "./core";
import { ApiSprints } from "./sprints";

export class ApiCardReads extends ApiSprints {
  // ---- cards ---------------------------------------------------------------------------------

  async listCards(projectId: string, query: CardQuery = {}): Promise<Page<Card>> {
    const params = new URLSearchParams();
    if (query.q) params.set("q", query.q);
    if (query.status?.[0]) params.set("status", query.status[0]); // see `ApiBacklogRepository`'s doc, note 1
    if (query.priority?.[0]) params.set("priority", query.priority[0]);
    if (query.epic) params.set("epic", query.epic);
    if (query.tag) params.set("tag", query.tag);
    if (query.assignee) params.set("assignee", query.assignee);
    if (query.executor) params.set("executor", query.executor);
    if (query.category) params.set("category", query.category);
    if (query.blocked !== undefined) params.set("blocked", String(query.blocked));
    if (query.humanEditPending !== undefined) params.set("humanEditPending", String(query.humanEditPending));
    if (query.sprint) params.set("sprint", query.sprint);
    if (query.rejection) params.set("rejection", query.rejection);
    if (query.role) params.set("role", query.role);
    if (query.sort) params.set("sort", query.sort);
    if (query.jql) params.set("jql", query.jql);
    if (query.cursor) params.set("cursor", query.cursor);
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString();
    return this.request<Page<Card>>(`/projects/${projectId}/cards${qs ? `?${qs}` : ""}`);
  }

  async listChanges(projectId: string, since?: string): Promise<CardChanges> {
    const qs = since ? `?since=${encodeURIComponent(since)}` : "";
    return this.request<CardChanges>(`/projects/${projectId}/cards/changes${qs}`);
  }

  async getCard(projectId: string, keyOrId: string): Promise<CardDetail> {
    const raw = await this.request<CardDetail & { comments: RawComment[] }>(
      `/projects/${projectId}/cards/${encodeURIComponent(keyOrId)}`,
    );
    return {
      ...raw,
      comments: raw.comments.map(mapComment),
      attachments: raw.attachments,
      development: raw.development ?? [],
    };
  }

  async cardsNeedsHuman(projectId: string, assigneeMe = false): Promise<Card[]> {
    const qs = assigneeMe ? "?assignee=me" : "";
    return this.request<Card[]>(`/projects/${projectId}/cards/needs-human${qs}`);
  }
}
