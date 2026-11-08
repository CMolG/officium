import { isMoveConflict, type DocMoveInput, type DocMoveResult, type DocRecent, type DocStar, type DocStarInput, type DocTreeNode, type VersionConflict } from "../types";
import { depthOf, findNode } from "../../docs/doc-tree";
import { isVisibleDoc, summaryOf } from "../../docs/doc-lifecycle";
import { placeStar } from "../../docs/doc-stars";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { now } from "./rules";
import { MemoryDocMoves } from "./doc-moves";

const KEEP = 50;

/** A star holds a page's id or a collection's path (the API holds the node's id: same survival of a move). */
type StarKey = `page:${string}` | `collection:${string}`;

/** A person's stars and recent pages (officium-api.md §8.21), as the API's `DocStarService` has them. */
export class MemoryDocStars extends MemoryDocMoves {
  private readonly stars = new Map<string, StarKey[]>();
  private readonly views = new Map<string, Map<string, string>>();

  async listDocStars(projectId: string): Promise<DocStar[]> {
    this.requireRecord(projectId);
    return (await this.listedStars(projectId)).map((entry) => entry.star);
  }

  /** What the caller sees of their stars, numbered 0..n-1 (the API's `DocStarService.starred`). */
  private async listedStars(projectId: string): Promise<{ key: StarKey; star: DocStar }[]> {
    const listed: { key: StarKey; star: DocStar }[] = [];
    const order = this.stars.get(projectId) ?? [];
    const { collections } = await this.getDocTree(projectId);
    order.forEach((key) => {
      const position = listed.length;
      const [kind, ref] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
      if (kind === "page") {
        const page = this.readablePages(projectId).find((candidate) => candidate.id === ref);
        const row = this.requireRecord(projectId).docNodes.get(page?.path ?? "");
        if (page) {
          listed.push({ key, star: { kind: "page", path: page.path, name: page.title, icon: row?.icon ?? null, iconColor: row?.iconColor ?? null, position, page: summaryOf(page) } });
        }
        return;
      }
      const node = findNode(collections, ref);
      if (node) {
        listed.push({ key, star: { kind: "collection", path: node.path, name: node.name, icon: node.icon, iconColor: node.iconColor, position, page: node.page } });
      }
    });
    return listed;
  }

  /** A collection's star follows the collection through a move, as the API's does by the node's id (JAVA-792). */
  override async moveDoc(projectId: string, rawPath: string, input: DocMoveInput): Promise<DocMoveResult | VersionConflict<DocTreeNode>> {
    const result = await super.moveDoc(projectId, rawPath, input);
    if (isMoveConflict(result)) return result;
    const was = `collection:${this.requireDocPath(rawPath)}`;
    const now: StarKey = `collection:${result.node.path}`;
    this.stars.set(projectId, (this.stars.get(projectId) ?? []).map((key) => (key === was ? now : key)));
    return result;
  }

  async starDoc(projectId: string, rawPath: string, input: DocStarInput = {}): Promise<DocStar> {
    const path = this.requireWritableDocPath(projectId, rawPath);
    const kind = input.kind ?? "page";
    if (kind !== "page" && kind !== "collection") throw new ApiError("invalid_star_kind", "`kind` is page or collection", 400);
    const key = kind === "page" ? this.pageKey(projectId, path) : await this.collectionKey(projectId, path);
    const seen = new Set((await this.listedStars(projectId)).map((entry) => entry.key));
    this.stars.set(projectId, placeStar(this.stars.get(projectId) ?? [], key, input.position, (star) => seen.has(star) || star === key));
    const star = (await this.listDocStars(projectId)).find((candidate) => candidate.kind === kind && candidate.path === path);
    return star!;
  }

  async unstarDoc(projectId: string, rawPath: string, kind: DocStar["kind"] = "page"): Promise<void> {
    const path = this.requireWritableDocPath(projectId, rawPath);
    // Idempotent, and it never needs the page to be readable (the API's unstar, JAVA-1476).
    const page = this.readablePages(projectId).find((candidate) => candidate.path === path);
    const key = kind === "page" ? (`page:${page?.id ?? ""}` as const) : (`collection:${path}` as const);
    this.stars.set(projectId, (this.stars.get(projectId) ?? []).filter((candidate) => candidate !== key));
  }

  async listRecentDocs(projectId: string, limit?: number): Promise<DocRecent[]> {
    this.requireRecord(projectId);
    const byId = new Map(this.readablePages(projectId).map((page) => [page.id, page]));
    const recent: DocRecent[] = [];
    for (const [id, viewedAt] of [...(this.views.get(projectId) ?? [])].sort((a, b) => b[1].localeCompare(a[1]))) {
      const page = byId.get(id);
      if (page) recent.push({ ...summaryOf(page), viewedAt });
    }
    return recent.slice(0, Math.max(1, Math.min(limit ?? KEEP, KEEP)));
  }

  async recordDocView(projectId: string, rawPath: string): Promise<void> {
    const path = this.requireDocPath(rawPath);
    if (this.isBuiltin(path)) return;
    const page = this.requireRecord(projectId).docs.get(path);
    if (!page || !isVisibleDoc(page, YOU.accountId)) throw new ApiError("doc_not_found", "No such page", 404);
    const seen = this.views.get(projectId) ?? new Map<string, string>();
    seen.delete(page.id);
    seen.set(page.id, now());
    const newest = [...seen].sort((a, b) => b[1].localeCompare(a[1])).slice(0, KEEP);
    this.views.set(projectId, new Map(newest));
  }

  private isBuiltin(path: string): boolean {
    return path === "officium" || path.startsWith("officium/");
  }

  /** What the caller can read: published pages and their own drafts, archived ones included, never the trash. */
  private readablePages(projectId: string) {
    return [...this.requireRecord(projectId).docs.values()].filter((page) => !page.template && isVisibleDoc(page, YOU.accountId));
  }

  private pageKey(projectId: string, path: string): StarKey {
    const page = this.readablePages(projectId).find((candidate) => candidate.path === path);
    if (!page) throw new ApiError("doc_not_found", "No such page", 404);
    return `page:${page.id}`;
  }

  private async collectionKey(projectId: string, path: string): Promise<StarKey> {
    if (depthOf(path) !== 1) {
      throw new ApiError("not_a_collection", "Only a collection (a first path segment) can be starred as one: star the page instead", 400);
    }
    const { collections } = await this.getDocTree(projectId);
    if (!findNode(collections, path)) throw new ApiError("doc_node_not_found", "No such collection", 404);
    const rows = this.requireRecord(projectId).docNodes;
    // Neutral, like the API's: a star changes nothing anyone else sees (JAVA-1476).
    if (!rows.has(path)) rows.set(path, { path, icon: null, iconColor: null, sortMode: "manual", position: null, version: 0, fullWidth: false });
    return `collection:${path}`;
  }
}
