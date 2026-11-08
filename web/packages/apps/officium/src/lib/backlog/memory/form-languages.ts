import type { Project, WriteResult } from "../types";
import { ApiError } from "../api-error";
import { MAX_FORM_LANGUAGES, normalizeFormLanguage } from "../form-languages";
import { YOU } from "../memory-seed";
import { now } from "./rules";
import { MemoryWorkspace } from "./workspace";

export class MemoryFormLanguages extends MemoryWorkspace {
  async setFormLanguages(
    projectId: string,
    input: { expectedVersion: number; formLanguages: string[] },
  ): Promise<WriteResult<Project>> {
    const record = this.requireRecord(projectId);
    const project = record.project;
    // Same order as the server: owner first, then the codes, then the version.
    if (project.role !== "owner") {
      throw new ApiError("owner_only", "Only the project's owner changes its form languages", 403);
    }
    const codes = input.formLanguages.map(normalizeFormLanguage);
    const distinct = [...new Set(codes)];
    if (codes.some((code) => code === null) || distinct.length !== codes.length || codes.length > MAX_FORM_LANGUAGES) {
      throw new ApiError("form_languages_invalid", "A form language is a code such as en or pt-br, listed once, up to ten", 400);
    }
    if (project.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The project changed since you loaded it.", current: { ...project } };
    }
    project.formLanguages = distinct as string[];
    project.version += 1;
    project.updatedAt = now();
    this.emit(record.project.id, { type: "project.updated", actor: YOU });
    return { ...project, formLanguages: [...project.formLanguages] };
  }
}
