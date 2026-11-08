import type { Project, WriteResult } from "../types";
import { ApiWorkspace } from "./workspace";

export class ApiFormLanguages extends ApiWorkspace {
  async setFormLanguages(
    projectId: string,
    input: { expectedVersion: number; formLanguages: string[] },
  ): Promise<WriteResult<Project>> {
    return this.requestVersioned<Project>(`/projects/${projectId}/form-languages`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }
}
