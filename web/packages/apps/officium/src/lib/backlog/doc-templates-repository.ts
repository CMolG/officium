import type { DocTemplate } from "./types";

/**
 * The project's templates (JAVA-801, officium-api.md §8.23): pages kept out of the tree and search to
 * start new pages from. They are made and used through `upsertDoc` (`template`, `fromTemplate`); this
 * is the list. Split from `BacklogRepository` so that file keeps its architecture ceiling.
 */
export interface DocTemplateRepository {
  /** By path, each with its collection (null: the project's). A template in the trash is not listed. */
  listDocTemplates(projectId: string): Promise<DocTemplate[]>;
}
