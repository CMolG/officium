import type { DocFile } from "../types";
import { ApiError } from "../api-error";
import { newId } from "../format";
import { now } from "./rules";
import { MemoryDocStars } from "./doc-stars";

const IMAGES = ["image/png", "image/jpeg", "image/gif", "image/webp"];
const REFUSED_IMAGES = ["image/heic", "image/heif", "image/avif", "image/tiff"];
const FILES = ["application/pdf", "text/plain", "text/markdown", "text/csv", "application/json", "application/zip"];
const TEN_MB = 10 * 1024 * 1024;
/** The owner's room for pages, versions and files, as the real allowance's free start (ADR 0013). */
const ALLOWANCE = 15 * 1024 * 1024;

interface Stored {
  file: DocFile;
  url: string;
}

/**
 * A page's files, as the API answers them (JAVA-798), without a server to reduce anything: a PNG, JPEG
 * or WebP is "reduced" to half its size so the before and after people see can be exercised, and every
 * refusal the server makes is made here by the declared type. The bytes stay in the tab as a blob URL.
 */
export class MemoryDocFiles extends MemoryDocStars {
  private readonly stored = new Map<string, Map<string, Stored>>();

  private pageFiles(projectId: string, path: string): Map<string, Stored> {
    const key = `${projectId}:${path}`;
    let files = this.stored.get(key);
    if (!files) this.stored.set(key, (files = new Map()));
    return files;
  }

  async uploadDocFile(projectId: string, rawPath: string, name: string, file: Blob): Promise<DocFile> {
    const path = this.requireWritableDocPath(projectId, rawPath);
    this.requireEditor(projectId);
    await this.getDoc(projectId, path);
    const files = this.pageFiles(projectId, path);
    if (!/^[a-z0-9][a-z0-9.-]{0,99}$/.test(name) || name.includes("..")) {
      throw new ApiError("attachment_name_invalid", "A file name is lower-case letters, digits, dots and hyphens", 400);
    }
    if (file.size > TEN_MB) throw new ApiError("attachment_too_large", "A page takes files up to 10 MB", 413);
    const type = (file.type || "application/octet-stream").toLowerCase();
    const image = IMAGES.includes(type);
    if (REFUSED_IMAGES.includes(type)) {
      throw new ApiError("unsupported_image", "This image format cannot be added: export it as a PNG or JPEG and add that", 415);
    }
    if (!image && !FILES.includes(type)) {
      throw new ApiError("unsupported_attachment_type", `Files of type ${type} are not accepted`, 415);
    }
    const storedBytes = image && type !== "image/gif" ? Math.ceil(file.size / 2) : file.size;
    const used = [...this.stored.values()].flatMap((m) => [...m.values()]).reduce((sum, s) => sum + s.file.storedBytes, 0);
    if (used + storedBytes > ALLOWANCE) {
      throw new ApiError("storage_quota_exceeded", "This project's owner has used the storage available to Officium", 403);
    }
    if (files.has(name)) throw new ApiError("attachment_exists", `"${name}" is already attached to this page`, 409);
    const doc: DocFile = {
      id: newId("file"), name, kind: image ? "image" : "file", contentType: type, originalBytes: file.size,
      storedBytes, width: 0, height: 0, uri: `doc://${path}/_files/${name}`, createdAt: now(),
    };
    files.set(name, { file: doc, url: URL.createObjectURL(file) });
    return doc;
  }

  async listDocFiles(projectId: string, rawPath: string): Promise<DocFile[]> {
    const { path } = await this.getDoc(projectId, rawPath);
    return [...this.pageFiles(projectId, path).values()].map((s) => s.file).sort((a, b) => a.name.localeCompare(b.name));
  }

  async deleteDocFile(projectId: string, rawPath: string, name: string): Promise<void> {
    const path = this.requireWritableDocPath(projectId, rawPath);
    this.requireEditor(projectId);
    if (!this.pageFiles(projectId, path).delete(name)) throw new ApiError("attachment_not_found", "No such file on this page", 404);
  }

  docFileUrl(projectId: string, rawPath: string, name: string): string {
    return this.pageFiles(projectId, rawPath).get(name)?.url ?? "";
  }
}
