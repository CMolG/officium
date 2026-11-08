import type { Card, Metrics, Sprint, WriteResult } from "../types";
import type { Subscription, ValueView } from "../value-types";
import { ApiPrecedence } from "./precedence";

export class ApiSprints extends ApiPrecedence {
  // ---- sprints (officium-api.md §8.2) ---------------------------------------------------------

  async listSprints(projectId: string, state?: Sprint["state"]): Promise<Sprint[]> {
    const qs = state ? `?state=${state}` : "";
    return this.request<Sprint[]>(`/projects/${projectId}/sprints${qs}`);
  }

  async createSprint(
    projectId: string,
    input: { name?: string; goal?: string; startDate?: string | null; endDate?: string | null } = {},
  ): Promise<Sprint> {
    return this.request<Sprint>(`/projects/${projectId}/sprints`, { method: "POST", body: JSON.stringify(input) });
  }

  async updateSprint(
    projectId: string,
    sprintId: string,
    input: {
      expectedVersion: number;
      name?: string;
      goal?: string;
      startDate?: string | null;
      endDate?: string | null;
      order?: number;
    },
  ): Promise<WriteResult<Sprint>> {
    return this.requestVersioned<Sprint>(`/projects/${projectId}/sprints/${sprintId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async startSprint(
    projectId: string,
    sprintId: string,
    input: { expectedVersion: number; startDate?: string | null; endDate?: string | null },
  ): Promise<WriteResult<Sprint>> {
    return this.requestVersioned<Sprint>(`/projects/${projectId}/sprints/${sprintId}/start`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // `current` on a conflict is documented as `<Card|Project>` (officium-api.md §1.3); it isn't
  // spelled out for a sprint's own endpoints, so this assumes the same shape applies to `Sprint`
  // and, for `complete`, is a bare `Sprint` rather than the success shape's `{sprint, moved}`
  // wrapper -- flagged for the API side to confirm.
  async completeSprint(
    projectId: string,
    sprintId: string,
    input: { expectedVersion: number; moveOpenCardsTo: string },
  ): Promise<WriteResult<{ sprint: Sprint; moved: string[] }>> {
    return this.requestVersioned<{ sprint: Sprint; moved: string[] }>(`/projects/${projectId}/sprints/${sprintId}/complete`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async deleteSprint(projectId: string, sprintId: string, expectedVersion: number): Promise<void> {
    await this.request<void>(`/projects/${projectId}/sprints/${sprintId}?expectedVersion=${expectedVersion}`, {
      method: "DELETE",
    });
  }

  async setCardSprint(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; sprintId: string | null; position: number },
  ): Promise<WriteResult<Card>> {
    return this.requestVersioned<Card>(`/projects/${projectId}/cards/${cardId}/sprint`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // ---- contributions: metrics (officium-api.md §8.3) -------------------------------------------

  async getMetrics(projectId: string, query: { from: string; to: string } | { sprintId: string }): Promise<Metrics> {
    const qs = "sprintId" in query ? `sprintId=${query.sprintId}` : `from=${query.from}&to=${query.to}`;
    return this.request<Metrics>(`/projects/${projectId}/metrics?${qs}`);
  }

  // ---- value report and subscription price (card://JAVA-1047) ---------------------------------

  async getValue(projectId: string, month: string): Promise<ValueView> {
    return this.request<ValueView>(`/projects/${projectId}/value?month=${encodeURIComponent(month)}`);
  }

  async getSubscription(): Promise<Subscription> {
    return this.request<Subscription>("/account/subscription");
  }

  async setSubscription(monthlyUsd: number): Promise<Subscription> {
    return this.request<Subscription>("/account/subscription", {
      method: "PUT",
      body: JSON.stringify({ monthlyUsd }),
      headers: { "Content-Type": "application/json" },
    });
  }
}
