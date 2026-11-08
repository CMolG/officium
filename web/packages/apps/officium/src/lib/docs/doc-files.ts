import type { ResolveImage } from "@javadaba/rich-text";

import { ApiError } from "../backlog/api-error";
import type { DocFile } from "../backlog/types";

/** `doc://<page>/_files/<name>`: the only addressing a page's files have (JAVA-798). */
const FILE_URI = /^doc:\/\/((?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*)\/_files\/([a-z0-9][a-z0-9.-]*)$/;

export function parseFileUri(src: string): { page: string; name: string } | null {
  const match = FILE_URI.exec(src);
  return match ? { page: match[1], name: match[2] } : null;
}

/** What the page and a read view know of its files: where each is read from, and its details. */
export interface DocFileContext {
  resolve: ResolveImage;
  info: ReadonlyMap<string, DocFile>;
}

/** An image is drawn only for a `doc://` file reference; every other source is the editor's placeholder. */
export function fileResolver(urlOf: (page: string, name: string) => string): ResolveImage {
  return (src) => {
    const ref = parseFileUri(src);
    return ref ? urlOf(ref.page, ref.name) || null : null;
  };
}

const MIME_EXTENSION: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const NAME_LIMIT = 100;

/** The name a file is stored under: what the server accepts as is, since it never renames. */
export function storedName(file: File, taken: ReadonlySet<string>, stamp: number): string {
  const dot = file.name.lastIndexOf(".");
  const extension = (dot > 0 ? file.name.slice(dot + 1) : MIME_EXTENSION[file.type] ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const stem = (dot > 0 ? file.name.slice(0, dot) : file.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const generic = !stem || /^(image|screenshot|untitled)(-\d+)?$/.test(stem);
  const base = (generic ? `pasted-image-${stamp}` : stem).slice(0, NAME_LIMIT - extension.length - 5);
  const suffix = extension ? `.${extension}` : "";
  let name = `${base}${suffix}`;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}${suffix}`;
  return name;
}

/** The caption a new image starts with, which is also its alt text: the name, said as words. */
export function captionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return (dot > 0 ? name.slice(0, dot) : name).replace(/[-.]+/g, " ").trim();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** What the uploader sees once a file is in: for an image the saving, for a file its size. */
export function savingWords(file: DocFile): string {
  if (file.kind === "file") return `${file.name} added (${formatBytes(file.storedBytes)})`;
  return file.storedBytes < file.originalBytes
    ? `${file.name}: ${formatBytes(file.originalBytes)} → ${formatBytes(file.storedBytes)}`
    : `${file.name}: kept as sent, ${formatBytes(file.storedBytes)}`;
}

/** A refusal said in words that tell the person what to do next. `full` is the storage state of its own. */
export function refusalWords(error: unknown, fileName: string): { text: string; full: boolean } {
  if (!(error instanceof ApiError)) return { text: `${fileName} was not added. Try again.`, full: false };
  switch (error.code) {
    case "storage_quota_exceeded":
      return { text: `Storage is full, so ${fileName} was not added.`, full: true };
    case "attachment_too_large":
      return { text: `${fileName} is too large: a page takes files up to 10 MB. Scale it down and add it again.`, full: false };
    case "network_error":
      return { text: `${fileName} was not added: the connection dropped. Add it again.`, full: false };
    default:
      return { text: `${fileName}: ${error.message}`, full: false };
  }
}
