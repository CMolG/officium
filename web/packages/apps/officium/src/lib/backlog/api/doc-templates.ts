import type { DocTemplateRepository } from "../doc-templates-repository";
import type { DocTemplate } from "../types";
import { ApiDocSearch } from "./doc-search";

/** The templates list (JAVA-801, officium-api.md §8.23). A template is written through `upsertDoc`. */
export class ApiDocTemplates extends ApiDocSearch implements DocTemplateRepository {
  async listDocTemplates(projectId: string): Promise<DocTemplate[]> {
    return this.request<DocTemplate[]>(`/projects/${projectId}/docs:templates`);
  }
}
