import type { Actor, DocPage, DocTemplate, DocUpsertInput, WriteResult } from "../types";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { summaryOf } from "../../docs/doc-lifecycle";
import { fillTemplate, isTimeZone, templateCollection } from "../../docs/doc-template";
import { ancestorsOf, findNode } from "../../docs/doc-tree";
import { now } from "./rules";
import { MemoryDocSearch } from "./doc-search";

const bytes = (text: string) => new TextEncoder().encode(text).length;
const nameOf = (actor: Actor) => (actor.kind === "agent" ? (actor.agentName ?? actor.name) : actor.name);

/** The combinations the API's `DocTemplates` refuses before it reads anything. */
function requireCoherent(input: DocUpsertInput): void {
  if (input.template && input.fromTemplate !== undefined) {
    throw new ApiError("template_and_from_template", "Send `template` to make a template or `fromTemplate` to make a page from one, not both", 400);
  }
  if (input.template && input.draft) {
    throw new ApiError("template_not_draft", "A template is never a draft: everyone in the project picks from it as soon as it exists", 400);
  }
  if (input.fromTemplate !== undefined && input.body !== undefined) {
    throw new ApiError("body_with_template", "`fromTemplate` writes the body from the template: leave `body` out", 400);
  }
  if (input.timeZone !== undefined && !isTimeZone(input.timeZone)) {
    throw new ApiError("invalid_time_zone", `"${input.timeZone}" is not a time zone: use an IANA name like Europe/Madrid`, 400);
  }
}

/**
 * Templates (JAVA-801), as the API answers them: born on a create, never a draft, never at a path the tree
 * shows, never archived; a page made from one is filled here the way the server fills it. Plus the one mock
 * switch the import's quota flow needs: an allowance on page bytes, so a drop can be seen stopping at the
 * first refusal.
 */
export class MemoryDocTemplates extends MemoryDocSearch {
  /** Page bytes the owner may hold, or null for no limit (the mock's default). */
  private docAllowance: number | null = null;

  setDocAllowance(limit: number | null): void {
    this.docAllowance = limit;
  }

  async listDocTemplates(projectId: string): Promise<DocTemplate[]> {
    return [...this.requireRecord(projectId).docs.values()]
      .filter((page) => page.template)
      .sort((a, b) => a.path.localeCompare(b.path))
      .map((page) => ({ ...summaryOf(page), collection: templateCollection(page.path) }));
  }

  override async upsertDoc(projectId: string, rawPath: string, input: DocUpsertInput, actor: Actor = YOU): Promise<WriteResult<DocPage>> {
    requireCoherent(input);
    const path = this.requireWritableDocPath(projectId, rawPath);
    if (this.requireRecord(projectId).docs.has(path)) {
      if (input.template || input.fromTemplate !== undefined) {
        throw new ApiError("template_only_on_create", "`template` and `fromTemplate` only mean something when the page is created", 400);
      }
      return super.upsertDoc(projectId, path, input, actor);
    }
    const under = ancestorsOf(path).find((ancestor) => this.requireRecord(projectId).docs.get(ancestor)?.template);
    if (under) {
      throw new ApiError("doc_path_taken", `"${under}" is a template's path: a page can't sit under it`, 409);
    }
    if (input.template && findNode((await this.getDocTree(projectId)).collections, path)) {
      throw new ApiError("doc_path_taken", `"${path}" is in the documentation tree: give the template a path of its own`, 409);
    }
    const write = input.fromTemplate === undefined ? input : this.filledFrom(projectId, input, actor);
    this.requireRoom(projectId, path, write);
    return super.upsertDoc(projectId, path, write, actor);
  }

  override async archiveDoc(projectId: string, path: string): Promise<DocPage> {
    const page = this.requireRecord(projectId).docs.get(this.requireDocPath(path));
    if (page?.template) {
      throw new ApiError("doc_is_template", `"${page.path}" is a template, which can't be archived: delete it instead`, 409);
    }
    return super.archiveDoc(projectId, path);
  }

  /** The write a page from a template makes: its title unless the caller sent one, and its body, filled. */
  private filledFrom(projectId: string, input: DocUpsertInput, actor: Actor): DocUpsertInput {
    const template = this.requireRecord(projectId).docs.get(this.requireDocPath(input.fromTemplate ?? ""));
    if (!template?.template) {
      throw new ApiError("doc_template_not_found", `No template at "${input.fromTemplate}"`, 404);
    }
    const at = new Date(now());
    const zone = input.timeZone ?? "UTC";
    return {
      title: input.title ?? fillTemplate(template.title, at, zone, nameOf(actor)),
      body: fillTemplate(template.body, at, zone, nameOf(actor)),
      draft: input.draft,
    };
  }

  private requireRoom(projectId: string, path: string, input: DocUpsertInput): void {
    if (this.docAllowance === null) return;
    const used = [...this.requireRecord(projectId).docs.values()].reduce((sum, page) => sum + bytes(page.path + page.title + page.body), 0);
    if (used + bytes(path + (input.title ?? "") + (input.body ?? "")) > this.docAllowance) {
      throw new ApiError("storage_quota_exceeded", "This project's owner has used the storage available to Officium", 403);
    }
  }
}
