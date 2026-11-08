import type { DocHistory, DocPage, DocSettings, WriteResult } from "../types";
import { ApiDocs } from "./docs";

export class ApiDocHistory extends ApiDocs {
  // ---- page history and the documentation settings (officium-api.md §8.16, JAVA-794) -----------
  // The verbs are PREFIXES of the page path (`docs:history/<path>`): a suffix on `docs/<path>` loses
  // to the greedy page route, which reads `a:history` as a bad page path.

  private encodedPath(path: string): string {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  async getDocHistory(projectId: string, path: string): Promise<DocHistory> {
    return this.request<DocHistory>(`/projects/${projectId}/docs:history/${this.encodedPath(path)}`);
  }

  async restoreDocRevision(projectId: string, path: string, revisionId: string, expectedVersion: number): Promise<WriteResult<DocPage>> {
    return this.requestVersioned<DocPage>(`/projects/${projectId}/docs:restore/${this.encodedPath(path)}`, {
      method: "POST",
      body: JSON.stringify({ revisionId, expectedVersion }),
    });
  }

  async deleteDocRevision(projectId: string, path: string, revisionId: string, confirm: string): Promise<void> {
    const qs = `?revisionId=${encodeURIComponent(revisionId)}&confirm=${encodeURIComponent(confirm)}`;
    await this.request<void>(`/projects/${projectId}/docs:history/${this.encodedPath(path)}${qs}`, { method: "DELETE" });
  }

  async getDocSettings(projectId: string): Promise<DocSettings> {
    return this.request<DocSettings>(`/projects/${projectId}/docs:settings`);
  }

  async updateDocSettings(projectId: string, input: { historyDays: number; expectedVersion?: number }): Promise<DocSettings> {
    return this.request<DocSettings>(`/projects/${projectId}/docs:settings`, { method: "PATCH", body: JSON.stringify(input) });
  }
}
