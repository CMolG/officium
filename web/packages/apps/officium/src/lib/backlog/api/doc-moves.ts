import type { DocBacklinks, DocMoveInput, DocMoveResult, DocPage, DocTreeNode, VersionConflict } from "../types";
import { ApiDocHistory } from "./doc-history";

export class ApiDocMoves extends ApiDocHistory {
  // ---- moving documentation (officium-api.md §8.20, JAVA-792) -----------------------------------

  private moveUrl(projectId: string, path: string, verb: "move" | "duplicate" | "backlinks"): string {
    return `/projects/${projectId}/docs/${path.split("/").map(encodeURIComponent).join("/")}:${verb}`;
  }

  async moveDoc(projectId: string, path: string, input: DocMoveInput): Promise<DocMoveResult | VersionConflict<DocTreeNode>> {
    return this.requestVersioned<DocMoveResult>(this.moveUrl(projectId, path, "move"), {
      method: "POST",
      body: JSON.stringify(input),
    }) as Promise<DocMoveResult | VersionConflict<DocTreeNode>>;
  }

  async duplicateDoc(projectId: string, path: string, input: { to?: string; title?: string } = {}): Promise<DocPage> {
    return this.request<DocPage>(this.moveUrl(projectId, path, "duplicate"), { method: "POST", body: JSON.stringify(input) });
  }

  async getDocBacklinks(projectId: string, path: string): Promise<DocBacklinks> {
    return this.request<DocBacklinks>(this.moveUrl(projectId, path, "backlinks"));
  }
}
