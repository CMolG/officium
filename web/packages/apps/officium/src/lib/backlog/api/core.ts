import { apiUrl } from "@javadaba/sdk/platform";
import { ApiError } from "../api-error";
import { type CardRequest, type RequestAnswer, answerCall, requestsPath } from "../card-requests";
import { type LiveChannel, openChannel } from "../live-channel";
import type { ChangeEvent, LiveStatus, WriteResult } from "../types";

export class ApiCore {
  // Relative on the web, absolute on Android, where there is no origin to be relative to.
  protected readonly base = apiUrl("/api/officium/v1");
  readonly persistent = true;

  // ---- transport ---------------------------------------------------------------------------

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, {
        credentials: "include",
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
    } catch {
      throw ApiError.network();
    }
    const body = parseBody(await res.text());
    if (!res.ok) throw failure(res, body);
    return body as T;
  }

  /** A binary answer (JAVA-1657's backlog zip): its bytes, and the filename the server named in
   *  `Content-Disposition`. Its errors read exactly like `request`'s. */
  protected async download(path: string): Promise<{ blob: Blob; filename: string }> {
    let res: Response;
    try {
      res = await fetch(`${this.base}${path}`, { credentials: "include" });
    } catch {
      throw ApiError.network();
    }
    if (!res.ok) throw failure(res, parseBody(await res.text()));
    const named = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "");
    return { blob: await res.blob(), filename: named?.[1] ?? "backlog.zip" };
  }

  /** Every versioned write goes through this: a `409 version_conflict` becomes a `WriteResult`
   *  the caller can render as the conflict UI, instead of an exception. Any OTHER error
   *  (network, 404, a different 409 like `key_prefix_taken`/`blocks_cycle`) still throws. */
  protected async requestVersioned<T>(path: string, init: RequestInit): Promise<WriteResult<T>> {
    try {
      return await this.request<T>(path, init);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "version_conflict") {
        const body = err.body as { message: string; current: unknown };
        return { error: "version_conflict", message: body.message, current: body.current as T };
      }
      throw err;
    }
  }

  async listRequests(projectId: string): Promise<CardRequest[]> {
    return this.request<CardRequest[]>(requestsPath(projectId));
  }

  async answerRequest(projectId: string, requestId: string, answer: RequestAnswer, note?: string): Promise<CardRequest> {
    const [path, init] = answerCall(projectId, requestId, answer, note);
    return this.request<CardRequest>(path, init);
  }

  // ---- live updates (officium-api.md §4) --------------------------------------------------------

  /** One stream per project, however many surfaces listen to it (JAVA-125): the board, the
   *  sidebar and an open card's attachments each subscribe, and each used to open its own. */
  private readonly channels = new Map<string, LiveChannel>();

  subscribe(
    projectId: string,
    listener: (event: ChangeEvent) => void,
    onStatus?: (status: LiveStatus) => void,
  ): () => void {
    let channel = this.channels.get(projectId);
    if (!channel) {
      channel = openChannel(`${this.base}/projects/${projectId}/events`, projectId, () => this.channels.delete(projectId));
      this.channels.set(projectId, channel);
    }
    return channel.add(listener, onStatus);
  }

  private workingChannel: LiveChannel | null = null;

  subscribeWorking(listener: (event: ChangeEvent) => void, onStatus?: (status: LiveStatus) => void): () => void {
    // `stream.ready` carries no project on this stream: it is the whole account's.
    this.workingChannel ??= openChannel(`${this.base}/working/events`, "", () => {
      this.workingChannel = null;
    });
    return this.workingChannel.add(listener, onStatus);
  }
}

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function failure(res: Response, body: unknown): ApiError {
  const err = body as { error?: string; message?: string } | null;
  return new ApiError(err?.error ?? "request_failed", err?.message ?? res.statusText, res.status, body);
}

export interface RawComment {
  id: string;
  cardId: string;
  author: { kind: string; accountId: string; name: string; agentName: string | null };
  text: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string | null;
}

/** See `ApiBacklogRepository`'s doc, note 2: `CardComment.author.kind` comes over the wire as `"PERSON"`/`"AGENT"`
 *  (Jackson's default enum name), not the contract's lowercase `"person"`/`"agent"`. */
export function mapComment(raw: RawComment) {
  return { ...raw, author: { ...raw.author, kind: raw.author.kind.toLowerCase() as "person" | "agent" } };
}
