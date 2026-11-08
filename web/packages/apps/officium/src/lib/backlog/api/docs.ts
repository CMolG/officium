import type { SuiteTrend, TestRun } from "../test-history-types";
import type { ChangelogEntry, ChangelogListing, ChangelogTokenStatus, DocListState, DocNodeInput, DocPage, DocPageSummary, DocPresence, DocPresenceState, DocTree, DocTreeNode, DocUpsertInput, DocsStatus, IssuedChangelogToken, VersionConflict, WriteResult } from "../types";
import { ApiOrganization } from "./organization";

export class ApiDocs extends ApiOrganization {
  // ---- documentation (officium-api.md §8.7) -----------------------------------------------------

  /** The path's slashes are the API's own (`{path: .+}`); each segment is encoded on its own. */
  protected docUrl(projectId: string, path: string): string {
    return `/projects/${projectId}/docs/${path.split("/").map(encodeURIComponent).join("/")}`;
  }

  async listDocs(projectId: string, q?: string): Promise<DocPageSummary[]> {
    // A blank `q` is the API's `400 text_required`: no query is the whole list.
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    return this.request<DocPageSummary[]>(`/projects/${projectId}/docs${qs}`);
  }

  async getDoc(projectId: string, path: string): Promise<DocPage> {
    return this.request<DocPage>(this.docUrl(projectId, path));
  }

  async beatDocPresence(projectId: string, path: string, client: string, state: DocPresenceState): Promise<DocPresence> {
    return this.request<DocPresence>(`${this.docUrl(projectId, path)}:presence`, {
      method: "POST",
      keepalive: true,
      body: JSON.stringify({ client, state }),
    });
  }

  async leaveDocPresence(projectId: string, path: string, client: string): Promise<void> {
    await this.request<void>(`${this.docUrl(projectId, path)}:presence?client=${encodeURIComponent(client)}`, {
      method: "DELETE",
      keepalive: true,
    });
  }

  async upsertDoc(projectId: string, path: string, input: DocUpsertInput): Promise<WriteResult<DocPage>> {
    return this.requestVersioned<DocPage>(this.docUrl(projectId, path), { method: "PUT", body: JSON.stringify(input) });
  }

  async deleteDoc(projectId: string, path: string, expectedVersion: number): Promise<void | VersionConflict<DocPage>> {
    return this.requestVersioned<void>(`${this.docUrl(projectId, path)}?expectedVersion=${expectedVersion}`, {
      method: "DELETE",
    }) as Promise<void | VersionConflict<DocPage>>;
  }

  // ---- the life of a page (JAVA-793, officium-api.md §8.7) --------------------------------------

  async listDocsIn(projectId: string, state: DocListState): Promise<DocPageSummary[]> {
    return this.request<DocPageSummary[]>(`/projects/${projectId}/docs?state=${state}`);
  }

  async publishDoc(projectId: string, path: string): Promise<DocPage> {
    return this.request<DocPage>(`${this.docUrl(projectId, path)}:publish`, { method: "POST" });
  }

  async archiveDoc(projectId: string, path: string): Promise<DocPage> {
    return this.request<DocPage>(`${this.docUrl(projectId, path)}:archive`, { method: "POST" });
  }

  async unarchiveDoc(projectId: string, path: string): Promise<DocPage> {
    return this.request<DocPage>(`${this.docUrl(projectId, path)}:unarchive`, { method: "POST" });
  }

  /** A trashed page is addressed by its id: one path can hold a live page and several trashed ones. */
  async restoreDoc(projectId: string, id: string): Promise<DocPage> {
    return this.request<DocPage>(`/projects/${projectId}/docs:trash/${id}:restore`, { method: "POST" });
  }

  async purgeDoc(projectId: string, id: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/docs:trash/${id}`, { method: "DELETE" });
  }

  // ---- the documentation tree's layout (officium-api.md §8.17) ----------------------------------

  async getDocTree(projectId: string): Promise<DocTree> {
    return this.request<DocTree>(`/projects/${projectId}/docs:tree`);
  }

  async updateDocNode(projectId: string, path: string, input: DocNodeInput): Promise<WriteResult<DocTreeNode>> {
    return this.requestVersioned<DocTreeNode>(`${this.docUrl(projectId, path)}:node`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  async deleteDocNode(projectId: string, path: string, expectedVersion: number): Promise<void | VersionConflict<DocTreeNode>> {
    return this.requestVersioned<void>(`${this.docUrl(projectId, path)}:node?expectedVersion=${expectedVersion}`, {
      method: "DELETE",
    }) as Promise<void | VersionConflict<DocTreeNode>>;
  }

  // ---- documentation changelog (officium-api.md §8.8) -------------------------------------------

  async listChangelog(projectId: string, query: { status?: DocsStatus; limit?: number } = {}): Promise<ChangelogListing> {
    const params = new URLSearchParams();
    if (query.status) params.set("status", query.status);
    if (query.limit) params.set("limit", String(query.limit));
    const qs = params.toString() ? `?${params}` : "";
    return this.request<ChangelogListing>(`/projects/${projectId}/changelog${qs}`);
  }

  async markChangelogEntry(
    projectId: string,
    entryId: string,
    input: { status: DocsStatus; pages: string[]; expectedVersion: number },
  ): Promise<WriteResult<ChangelogEntry>> {
    return this.requestVersioned<ChangelogEntry>(`/projects/${projectId}/changelog/${entryId}/mark`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getChangelogToken(projectId: string): Promise<ChangelogTokenStatus> {
    return this.request<ChangelogTokenStatus>(`/projects/${projectId}/changelog/token`);
  }

  async issueChangelogToken(projectId: string): Promise<IssuedChangelogToken> {
    return this.request<IssuedChangelogToken>(`/projects/${projectId}/changelog/token`, { method: "POST" });
  }

  async revokeChangelogToken(projectId: string): Promise<void> {
    await this.request<void>(`/projects/${projectId}/changelog/token`, { method: "DELETE" });
  }

  // ---- test-run history (officium-api.md §8.12) ------------------------------------------------

  async listTestRuns(projectId: string, query: { limit?: number } = {}): Promise<TestRun[]> {
    const qs = query.limit ? `?limit=${query.limit}` : "";
    return this.request<TestRun[]>(`/projects/${projectId}/tests/runs${qs}`);
  }

  async listTestSuites(projectId: string, query: { suite?: string; points?: number } = {}): Promise<SuiteTrend[]> {
    const params = new URLSearchParams();
    if (query.suite) params.set("suite", query.suite);
    if (query.points) params.set("points", String(query.points));
    const qs = params.toString() ? `?${params}` : "";
    return this.request<SuiteTrend[]>(`/projects/${projectId}/tests/suites${qs}`);
  }
}
