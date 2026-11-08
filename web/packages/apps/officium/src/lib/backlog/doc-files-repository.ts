import type { DocFile } from "./types";

/**
 * A page's files and images (JAVA-798, officium-api.md §8.7). Split from `BacklogRepository` so that
 * file keeps its architecture ceiling.
 */
export interface DocFilesRepository {
  /**
   * Adds a file or an image to a page (JAVA-798), editors only. The server reduces an image and strips
   * its metadata, and answers what it kept (`storedBytes`); it never renames, so a taken name is
   * `409 attachment_exists`. Refusals throw an `ApiError`: `attachment_too_large`, `unsupported_image`,
   * `unsupported_attachment_type`, `image_malformed`, `image_too_many_pixels`, `image_busy`,
   * `storage_quota_exceeded`.
   */
  uploadDocFile(projectId: string, path: string, name: string, file: Blob): Promise<DocFile>;
  listDocFiles(projectId: string, path: string): Promise<DocFile[]>;
  deleteDocFile(projectId: string, path: string, name: string): Promise<void>;
  /** Where a page's file is read from, to draw an image or download a file. No request is made. */
  docFileUrl(projectId: string, path: string, name: string): string;
}
