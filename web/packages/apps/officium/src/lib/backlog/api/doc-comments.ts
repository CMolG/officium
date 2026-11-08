import type { Actor } from "../types";
import type { DocCommentInput, DocCommentState, DocThread } from "../doc-comment-types";
import { ApiDocTemplates } from "./doc-templates";

type RawActor = Omit<Actor, "kind"> & { kind: string };
type RawThread = Omit<DocThread, "resolvedBy" | "comments"> & {
  resolvedBy: RawActor | null;
  comments: (Omit<DocThread["comments"][number], "author"> & { author: RawActor })[];
};

/** The domain `Actor` comes over the wire with Jackson's enum name (`"PERSON"`), as card comments' authors do. */
const actorOf = (raw: RawActor): Actor => ({ ...raw, kind: raw.kind.toLowerCase() as Actor["kind"] });

function threadOf(raw: RawThread): DocThread {
  return { ...raw, resolvedBy: raw.resolvedBy ? actorOf(raw.resolvedBy) : null, comments: raw.comments.map((c) => ({ ...c, author: actorOf(c.author) })) };
}

/** A page's comment threads (JAVA-797, officium-api.md §8.25): `…/docs/<path>/_comments`, and the project's own `…/docs:comments`. */
export class ApiDocComments extends ApiDocTemplates {
  private commentsUrl(projectId: string, path: string): string {
    return `/projects/${projectId}/docs/${path.split("/").map(encodeURIComponent).join("/")}/_comments`;
  }

  private async send(url: string, init?: RequestInit): Promise<DocThread> {
    return threadOf(await this.request<RawThread>(url, init));
  }

  private json(method: string, body: unknown): RequestInit {
    return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
  }

  async listDocComments(projectId: string, path: string, state: DocCommentState = "open"): Promise<DocThread[]> {
    return (await this.request<RawThread[]>(`${this.commentsUrl(projectId, path)}?state=${state}`)).map(threadOf);
  }

  async listProjectDocComments(projectId: string, state: DocCommentState = "open", limit = 50): Promise<DocThread[]> {
    return (await this.request<RawThread[]>(`/projects/${projectId}/docs:comments?state=${state}&limit=${limit}`)).map(threadOf);
  }

  addDocComment(projectId: string, path: string, input: DocCommentInput): Promise<DocThread> {
    return this.send(this.commentsUrl(projectId, path), this.json("POST", input));
  }

  editDocComment(projectId: string, path: string, commentId: string, text: string): Promise<DocThread> {
    return this.send(`${this.commentsUrl(projectId, path)}/${commentId}`, this.json("PATCH", { text }));
  }

  async deleteDocComment(projectId: string, path: string, commentId: string): Promise<DocThread | null> {
    const answer = await this.request<{ thread: RawThread | null }>(`${this.commentsUrl(projectId, path)}/${commentId}`, { method: "DELETE" });
    return answer.thread ? threadOf(answer.thread) : null;
  }

  resolveDocComment(projectId: string, path: string, commentId: string): Promise<DocThread> {
    return this.send(`${this.commentsUrl(projectId, path)}/${commentId}:resolve`, { method: "POST" });
  }

  unresolveDocComment(projectId: string, path: string, commentId: string): Promise<DocThread> {
    return this.send(`${this.commentsUrl(projectId, path)}/${commentId}:unresolve`, { method: "POST" });
  }

  reactDocComment(projectId: string, path: string, commentId: string, emoji: string): Promise<DocThread> {
    return this.send(`${this.commentsUrl(projectId, path)}/${commentId}:react`, this.json("POST", { emoji }));
  }

  unreactDocComment(projectId: string, path: string, commentId: string, emoji: string): Promise<DocThread> {
    return this.send(`${this.commentsUrl(projectId, path)}/${commentId}:unreact`, this.json("POST", { emoji }));
  }
}
