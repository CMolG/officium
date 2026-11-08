import type { DocFile } from "../types";
import { ApiDocStars } from "./doc-stars";

/** A page's files and images (JAVA-798, officium-api.md §8.7): `…/docs/<path>/_files/<name>`, raw bytes in and out. */
export class ApiDocFiles extends ApiDocStars {
  private filesUrl(projectId: string, path: string): string {
    return `/projects/${projectId}/docs/${path.split("/").map(encodeURIComponent).join("/")}/_files`;
  }

  async uploadDocFile(projectId: string, path: string, name: string, file: Blob): Promise<DocFile> {
    return this.request<DocFile>(`${this.filesUrl(projectId, path)}/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
  }

  async listDocFiles(projectId: string, path: string): Promise<DocFile[]> {
    return this.request<DocFile[]>(this.filesUrl(projectId, path));
  }

  async deleteDocFile(projectId: string, path: string, name: string): Promise<void> {
    await this.request<void>(`${this.filesUrl(projectId, path)}/${encodeURIComponent(name)}`, { method: "DELETE" });
  }

  docFileUrl(projectId: string, path: string, name: string): string {
    return `${this.base}${this.filesUrl(projectId, path)}/${encodeURIComponent(name)}`;
  }
}
