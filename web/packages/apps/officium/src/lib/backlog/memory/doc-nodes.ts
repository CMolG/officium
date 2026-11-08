import type { DocNodeInput, DocSortMode, DocTree, DocTreeNode, VersionConflict, WriteResult } from "../types";
import { depthOf, buildDocTree, findNode, siblingsOf, type DocNodeRow } from "../../docs/doc-tree";
import { isVisibleDoc, summaryOf } from "../../docs/doc-lifecycle";
import { isDocColor, isDocIcon } from "../../docs/doc-node-rules";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { BUILTIN_DOCS } from "./sample-record";
import { MemoryDocs } from "./docs";

const SORT_MODES: readonly DocSortMode[] = ["manual", "alphabetical"];

/** The documentation tree's layout (officium-api.md §8.17), as the API's `DocTreeService` does it. */
export class MemoryDocNodes extends MemoryDocs {
  async getDocTree(projectId: string): Promise<DocTree> {
    const record = this.requireRecord(projectId);
    return {
      pinned: BUILTIN_DOCS.map((page) => summaryOf({ ...page, projectId })),
      collections: this.roots(projectId, record.docNodes),
    };
  }

  async updateDocNode(projectId: string, rawPath: string, input: DocNodeInput): Promise<WriteResult<DocTreeNode>> {
    const path = this.requireNodeWritable(projectId, rawPath);
    const record = this.requireRecord(projectId);
    if (input.sortMode !== undefined && !SORT_MODES.includes(input.sortMode)) {
      throw new ApiError("invalid_sort_mode", 'A sort mode is "manual" or "alphabetical"', 400);
    }
    const roots = this.roots(projectId, record.docNodes);
    const shown = findNode(roots, path);
    if (!shown && depthOf(path) > 1) throw new ApiError("doc_node_not_found", "No such node: put a page under it first", 404);
    const row = record.docNodes.get(path);
    const version = row?.version ?? 0;
    if (input.expectedVersion !== undefined ? input.expectedVersion !== version : version > 0) {
      return this.nodeConflict(projectId, path);
    }
    const created = !shown;
    // A version-0 row is only somebody's star (JAVA-1476): an edit writes over it.
    const base: DocNodeRow = row && !created ? row : {
      path, icon: created ? "folder" : null, iconColor: created ? "slate" : null, sortMode: "manual", position: null, version: 0, fullWidth: false,
    };
    const next = { ...base, version: base.version + 1 };
    if (input.icon !== undefined) next.icon = input.icon === "" ? null : this.checked(input.icon, isDocIcon, "invalid_doc_icon", "An icon is an icon name like \"book-open\" or exactly one emoji");
    if (input.iconColor !== undefined) next.iconColor = input.iconColor === "" ? null : this.checked(input.iconColor, isDocColor, "invalid_doc_color", `"${input.iconColor}" is not one of the palette's colors`);
    if (input.sortMode !== undefined) next.sortMode = input.sortMode;
    if (input.fullWidth !== undefined) next.fullWidth = input.fullWidth;
    const position = input.position ?? (created ? Number.MAX_SAFE_INTEGER : undefined);
    if (position === undefined) {
      record.docNodes.set(path, next);
    } else {
      this.reorder(record.docNodes, roots, next, position);
    }
    this.emit(projectId, { type: "doc.changed", path, actor: YOU });
    const node = findNode(this.roots(projectId, record.docNodes), path) ?? this.bare(next);
    return { ...node };
  }

  async deleteDocNode(projectId: string, rawPath: string, expectedVersion: number): Promise<void | VersionConflict<DocTreeNode>> {
    const path = this.requireNodeWritable(projectId, rawPath);
    const record = this.requireRecord(projectId);
    const row = record.docNodes.get(path);
    if (!row) throw new ApiError("doc_node_not_found", "No such node", 404);
    const shown = findNode(this.roots(projectId, record.docNodes), path);
    if (shown && (shown.page || shown.children.length > 0)) {
      throw new ApiError("doc_node_not_empty", "A node with a page or pages under it can't be deleted: delete or move them first", 409);
    }
    if (row.version !== expectedVersion) return this.nodeConflict(projectId, path);
    record.docNodes.delete(path);
    this.emit(projectId, { type: "doc.changed", path, actor: YOU });
  }

  /** The tree YOU see, as the API's: published pages and your own drafts, never the archive (JAVA-793). */
  protected roots(projectId: string, rows: Map<string, DocNodeRow>): DocTreeNode[] {
    const pages = [...this.requireRecord(projectId).docs.values()].filter((d) => !d.archivedAt && !d.template && isVisibleDoc(d, YOU.accountId));
    return buildDocTree(pages.map((page) => summaryOf(page)), rows.values());
  }

  protected reorder(rows: Map<string, DocNodeRow>, roots: DocTreeNode[], target: DocNodeRow, position: number): void {
    const parent = target.path.includes("/") ? findNode(roots, target.path.slice(0, target.path.lastIndexOf("/"))) : null;
    if (parent?.sortMode === "alphabetical") {
      throw new ApiError("doc_sorted_alphabetically", `"${parent.path}" is sorted A-Z: switch it to manual to place its pages`, 409);
    }
    const order = siblingsOf(roots, target.path).map((n) => n.path).filter((p) => p !== target.path);
    order.splice(Math.max(0, Math.min(position, order.length)), 0, target.path);
    order.forEach((path, index) => {
      if (path === target.path) return void rows.set(path, { ...target, position: index });
      const existing = rows.get(path);
      if (!existing) rows.set(path, { path, icon: null, iconColor: null, sortMode: "manual", position: index, version: 1, fullWidth: false });
      else if (existing.position !== index) rows.set(path, { ...existing, position: index, version: existing.version + 1 });
    });
  }

  private checked(value: string, valid: (v: string) => boolean, code: string, message: string): string {
    if (!valid(value)) throw new ApiError(code, message, 400);
    return value;
  }

  protected requireNodeWritable(projectId: string, rawPath: string): string {
    const path = this.requireWritableDocPath(projectId, rawPath);
    if (this.requireRecord(projectId).project.role === "viewer") throw new ApiError("read_only", "Viewers cannot write to this project", 403);
    return path;
  }

  private bare(row: DocNodeRow): DocTreeNode {
    const segment = row.path.slice(row.path.lastIndexOf("/") + 1);
    return { ...row, segment, depth: depthOf(row.path), name: segment, page: null, children: [] };
  }

  protected nodeConflict(projectId: string, path: string): VersionConflict<DocTreeNode> {
    const record = this.requireRecord(projectId);
    const current = findNode(this.roots(projectId, record.docNodes), path) ?? this.bare(record.docNodes.get(path)!);
    return { error: "version_conflict", message: "The node changed since you last read it", current: { ...current } };
  }
}
