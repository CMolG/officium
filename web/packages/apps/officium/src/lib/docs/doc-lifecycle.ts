import type { DocPage, DocPageSummary } from "../backlog/types";

/** Whoever created an unpublished draft sees it; once published, everyone in the project does
 *  (JAVA-793, officium-api.md §8.7). The API decides this in SQL; the mock mirrors it here. */
export function isVisibleDoc(page: Pick<DocPage, "publishedAt" | "createdBy">, accountId: string): boolean {
  return page.publishedAt !== null || page.createdBy.accountId === accountId;
}

/** A page as a list row: no body, and the lifecycle's who and when only when the list is the archive or the trash. */
export function summaryOf(
  page: DocPage,
  trashed?: { deletedAt: string; deletedBy: DocPageSummary["deletedBy"] },
): DocPageSummary {
  const { id, path, title, version, updatedBy, updatedAt, builtin, publishedAt, archivedAt, archivedBy, template } = page;
  const deletedAt = trashed?.deletedAt ?? null;
  const purgeAfter = deletedAt ? new Date(Date.parse(deletedAt) + 30 * 86_400_000).toISOString() : null;
  return {
    id, path, title, version, updatedBy, updatedAt, builtin, published: publishedAt !== null, archivedAt, archivedBy,
    deletedAt, deletedBy: trashed?.deletedBy ?? null, purgeAfter, template: template === true,
  };
}
