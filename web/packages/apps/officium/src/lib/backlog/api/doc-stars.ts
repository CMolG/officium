import type { DocNavigationRepository } from "../doc-navigation";
import type { DocRecent, DocStar, DocStarInput } from "../types";
import { ApiDocMoves } from "./doc-moves";

/** A person's stars and recent pages (JAVA-799, officium-api.md §8.21). */
export class ApiDocStars extends ApiDocMoves implements DocNavigationRepository {
  private starUrl(projectId: string, path: string): string {
    return `/projects/${projectId}/docs/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async listDocStars(projectId: string): Promise<DocStar[]> {
    return this.request<DocStar[]>(`/projects/${projectId}/docs:starred`);
  }

  async starDoc(projectId: string, path: string, input: DocStarInput = {}): Promise<DocStar> {
    return this.request<DocStar>(`${this.starUrl(projectId, path)}:star`, { method: "POST", body: JSON.stringify(input) });
  }

  async unstarDoc(projectId: string, path: string, kind: DocStar["kind"] = "page"): Promise<void> {
    await this.request<void>(`${this.starUrl(projectId, path)}:star?kind=${kind}`, { method: "DELETE" });
  }

  async listRecentDocs(projectId: string, limit?: number): Promise<DocRecent[]> {
    return this.request<DocRecent[]>(`/projects/${projectId}/docs:recent${limit ? `?limit=${limit}` : ""}`);
  }

  async recordDocView(projectId: string, path: string): Promise<void> {
    await this.request<void>(`${this.starUrl(projectId, path)}:view`, { method: "POST", keepalive: true });
  }
}
