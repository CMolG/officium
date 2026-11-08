import type { AgentWindow, AgentWork, Assignee, Card, Executor, HeartbeatDevice, IssuedHeartbeatToken, ProjectWork, QueuedCardEntry, RunState, WriteResult } from "../types";
import { ApiCardWrites } from "./card-writes";

export class ApiCardWork extends ApiCardWrites {
  async setExecutor(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; executor: Executor; assignee?: Assignee },
  ): Promise<WriteResult<Card>> {
    return this.requestVersioned<Card>(`/projects/${projectId}/cards/${cardId}/executor`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async setRunState(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; runState: RunState },
  ): Promise<WriteResult<Card>> {
    return this.requestVersioned<Card>(`/projects/${projectId}/cards/${cardId}/run-state`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async changeAssignee(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; assignees: Assignee[] },
  ): Promise<WriteResult<Card>> {
    // No dedicated endpoint on the real API -- `assignees` is one of `PATCH .../cards/{id}`'s
    // editable fields, same as title/description/etc.
    return this.updateCard(projectId, cardId, input);
  }

  async listWorking(projectId: string): Promise<AgentWork[]> {
    return this.request<AgentWork[]>(`/projects/${projectId}/cards/working`);
  }

  async listWorkingEverywhere(): Promise<ProjectWork[]> {
    return this.request<ProjectWork[]>("/working");
  }

  async listAgentWindows(): Promise<AgentWindow[]> {
    return this.request<AgentWindow[]>("/sessions");
  }

  async queueCard(projectId: string, keyOrId: string, sessionId: string): Promise<QueuedCardEntry> {
    return this.request<QueuedCardEntry>(`/projects/${projectId}/cards/${encodeURIComponent(keyOrId)}/queue`, {
      method: "PUT",
      body: JSON.stringify({ sessionId }),
    });
  }

  async unqueueCard(projectId: string, keyOrId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/cards/${encodeURIComponent(keyOrId)}/queue`, { method: "DELETE" });
  }

  async listHeartbeatDevices(): Promise<HeartbeatDevice[]> {
    return this.request<HeartbeatDevice[]>("/heartbeat/tokens");
  }

  async issueHeartbeatToken(machine: string | null): Promise<IssuedHeartbeatToken> {
    return this.request<IssuedHeartbeatToken>("/heartbeat/tokens", { method: "POST", body: JSON.stringify({ machine }) });
  }

  async revokeHeartbeatDevice(id: string): Promise<void> {
    await this.request<void>(`/heartbeat/tokens/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
