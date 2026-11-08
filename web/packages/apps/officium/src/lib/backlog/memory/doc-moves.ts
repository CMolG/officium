import type { DocBacklinks, DocMoveInput, DocMoveResult, DocPage, DocPageSummary, DocTreeNode, VersionConflict } from "../types";
import { ancestorsOf, buildDocTree, findNode, depthOf, type DocNodeRow } from "../../docs/doc-tree";
import { isVisibleDoc, summaryOf } from "../../docs/doc-lifecycle";
import { CHANGELOG_PATH, TEST_HISTORY_PATH, isBuiltinDocPath } from "../../docs/doc-path";
import { docRefs } from "../../docs/doc-links";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { MemoryDocLifecycle } from "./doc-lifecycle";

const MAX_DEPTH = 8;
const MAX_LENGTH = 200;
const atOrUnder = (path: string, root: string) => path === root || path.startsWith(`${root}/`);
const MAX_TITLE = 200;
const COPY = " (copy)";
/** `<title> (copy)`, the title cut at its end when the two would pass the limit, as the API does. */
const copyTitle = (title: string) => `${title.slice(0, MAX_TITLE - COPY.length)}${COPY}`;

/** The move, duplicate and backlinks of the API's `DocMoveService` (officium-api.md §8.20), over the in-memory pages. */
export class MemoryDocMoves extends MemoryDocLifecycle {
  /** Every page that holds a path: the tree's, and the archived ones a move takes along (other members' drafts excluded). */
  private treeRoots(projectId: string) {
    const record = this.requireRecord(projectId);
    const pages = [...record.docs.values()].filter((page) => isVisibleDoc(page, YOU.accountId));
    return buildDocTree(pages.map((page) => summaryOf(page)), record.docNodes.values());
  }

  async moveDoc(projectId: string, rawPath: string, input: DocMoveInput): Promise<DocMoveResult | VersionConflict<DocTreeNode>> {
    this.count("moveDoc"); // a spec checks a refused drop sends nothing
    const from = this.requireNodeWritable(projectId, rawPath);
    const to = this.requireDocPath(input.to);
    if (isBuiltinDocPath(to)) {
      throw new ApiError("builtin_doc_read_only", `"${to}" is where Officium's own pages live: move the page somewhere else`, 403);
    }
    if (from === to) throw new ApiError("doc_move_same_path", `"${from}" is already there`, 400);
    if (to.startsWith(`${from}/`)) throw new ApiError("doc_move_into_itself", `"${from}" can't move inside itself, to "${to}"`, 400);
    const record = this.requireRecord(projectId);
    const pages = [...record.docs.values()].filter((page) => atOrUnder(page.path, from) && isVisibleDoc(page, YOU.accountId));
    const remap = (path: string) => (path === from ? to : `${to}${path.slice(from.length)}`);
    for (const target of [to, ...pages.map((page) => remap(page.path))]) {
      if (target === CHANGELOG_PATH || target === TEST_HISTORY_PATH) {
        throw new ApiError("reserved_doc_path", `"${target}" is where the web shows a built-in view: give the page another path`, 400);
      }
      if (depthOf(target) > MAX_DEPTH || target.length > MAX_LENGTH) {
        throw new ApiError("invalid_doc_path", `"${target}" would pass ${MAX_DEPTH} segments or ${MAX_LENGTH} characters`, 400);
      }
    }
    const roots = this.treeRoots(projectId);
    const source = findNode(roots, from);
    if (!source) throw new ApiError("doc_not_found", "No such page", 404);
    if (input.expectedVersion !== undefined && input.expectedVersion !== source.version) return this.nodeConflict(projectId, from);
    if (pages.length === 0 && depthOf(to) > 1) {
      throw new ApiError("doc_move_empty", "A collection with no pages can only move to the top level", 400);
    }
    // A template holds its path though no tree shows it (JAVA-801); one under `from` moves along with it.
    if (findNode(roots, to) || record.docs.get(to)?.template) throw new ApiError("doc_path_taken", `Already taken: ${to}`, 409);
    // Another member's draft can hold a path the move would take: the tree doesn't show it, the API's unique index refuses.
    const moving = new Set(pages.map((page) => page.path));
    if (pages.some((page) => record.docs.has(remap(page.path)) && !moving.has(remap(page.path)))) {
      throw new ApiError("doc_path_taken", `Already taken: ${to}`, 409);
    }
    // A page can't land under a template's path (JAVA-1479): the API refuses the same move.
    const landing = [to, ...pages.map((page) => remap(page.path))].flatMap(ancestorsOf);
    if (landing.some((ancestor) => record.docs.get(ancestor)?.template)) {
      throw new ApiError("doc_path_taken", `Already taken: ${to}`, 409);
    }

    const sameParent = from.slice(0, from.lastIndexOf("/")) === to.slice(0, Math.max(to.lastIndexOf("/"), 0)) && from.includes("/") === to.includes("/");
    const rows = [...record.docNodes.values()].filter((row) => atOrUnder(row.path, from));
    for (const path of [...record.docNodes.keys()]) {
      if (atOrUnder(path, from) || atOrUnder(path, to)) record.docNodes.delete(path);
    }
    const moved = pages.map((page) => {
      record.docs.delete(page.path);
      const next = remap(page.path);
      record.docs.set(next, { ...page, path: next });
      record.docRedirects.set(page.path, page.id);
      record.docRedirects.delete(next);
      return { from: page.path, to: next };
    });
    for (const row of rows) {
      const next: DocNodeRow = { ...row, path: remap(row.path), version: row.version + 1 };
      if (row.path === from && !sameParent) next.position = null;
      record.docNodes.set(next.path, next);
    }
    if (input.position !== undefined) {
      const base: DocNodeRow = record.docNodes.get(to) ?? { path: to, icon: null, iconColor: null, sortMode: "manual", position: null, version: 1, fullWidth: false };
      this.reorder(record.docNodes, this.treeRoots(projectId), base, input.position);
    }
    this.emit(projectId, { type: "doc.changed", actor: YOU });
    const node = findNode(this.treeRoots(projectId), to);
    if (!node) throw new ApiError("doc_not_found", "No such page", 404);
    return { node, moved };
  }

  async duplicateDoc(projectId: string, rawPath: string, input: { to?: string; title?: string } = {}): Promise<DocPage> {
    const source = this.readDoc(projectId, rawPath);
    const record = this.requireRecord(projectId);
    const roots = this.treeRoots(projectId);
    let target = input.to?.trim() ? this.requireDocPath(input.to) : `${source.path}-copy`;
    const taken = (path: string) => findNode(roots, path) !== null || Boolean(record.docs.get(path)?.template);
    for (let n = 2; !input.to?.trim() && taken(target); n += 1) target = `${source.path}-copy-${n}`;
    if (taken(target)) throw new ApiError("doc_path_taken", `Already taken: ${target}`, 409);
    const title = input.title?.trim() || copyTitle(source.title);
    // A draft's copy stays a draft, and a template's stays a template (JAVA-801), as on the API.
    const created = await this.upsertDoc(
      projectId,
      target,
      source.template ? { title, body: source.body, template: true } : { title, body: source.body, draft: source.publishedAt === null },
    );
    if ("error" in created) throw new ApiError("doc_path_taken", `Already taken: ${target}`, 409);
    const style = record.docNodes.get(source.path);
    if (style && (style.icon || style.iconColor || style.fullWidth)) {
      record.docNodes.set(target, { ...style, path: target, position: null, version: 1 });
    }
    return created;
  }

  async getDocBacklinks(projectId: string, rawPath: string): Promise<DocBacklinks> {
    // Counted and holdable like a read (`mock-test-hooks.ts`): a spec sees "Referenced by" load, and fail.
    this.count("getDocBacklinks");
    await this.holds.get("getDocBacklinks")?.promise;
    const page = this.readDoc(projectId, rawPath);
    const record = this.requireRecord(projectId);
    const names = new Set([page.path]);
    for (const [oldPath, id] of record.docRedirects) if (id === page.id) names.add(oldPath);
    const pages: DocPageSummary[] = [...record.docs.values()]
      .filter((other) => other.id !== page.id && isVisibleDoc(other, YOU.accountId) && docRefs(other.path, other.body).some((ref) => names.has(ref)))
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((other) => summaryOf(other));
    return { path: page.path, redirectedFrom: page.redirectedFrom ?? null, pages };
  }
}
