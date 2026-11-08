import type { Project, WriteResult } from "./types";

/** The project's form languages (JAVA-1082): the owner sets them, everyone reads them on the project view. */
export interface FormLanguageRepository {
  /** Replaces the list (`[]` clears it). Owner only (`403 owner_only`, thrown); `form_languages_invalid` (400) throws too. */
  setFormLanguages(
    projectId: string,
    input: { expectedVersion: number; formLanguages: string[] },
  ): Promise<WriteResult<Project>>;
}
