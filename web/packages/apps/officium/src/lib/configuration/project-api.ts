import { apiUrl } from "@javadaba/sdk/platform";

import { ApiError } from "../backlog/api-error";
import { USES_MEMORY_BACKEND } from "../backlog/get-repository";
import type { WriteResult } from "../backlog/types";

/**
 * The transport of the project settings that live beside the board's repository (precedence, the integration gate):
 * the same base, cookie and error shape as `ApiCore`, kept out of the repository chain because Configuration owns them.
 * A build on the in-memory backend (the e2e suite) has no server to ask: callers branch on `USES_MEMORY_BACKEND`.
 */
export const MEMORY_BACKEND = USES_MEMORY_BACKEND;

const BASE = apiUrl("/api/officium/v1");

function parse(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function projectRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      credentials: "include",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw ApiError.network();
  }
  const body = parse(await res.text());
  if (!res.ok) {
    const err = body as { error?: string; message?: string } | null;
    throw new ApiError(err?.error ?? "request_failed", err?.message ?? res.statusText, res.status, body);
  }
  return body as T;
}

/** A versioned write: the server's `409 version_conflict` becomes a `WriteResult` the page renders as its conflict. */
export async function projectWrite<T>(path: string, init: RequestInit): Promise<WriteResult<T>> {
  try {
    return await projectRequest<T>(path, init);
  } catch (err) {
    if (err instanceof ApiError && err.status === 409 && err.code === "version_conflict") {
      const body = err.body as { message: string; current: unknown };
      return { error: "version_conflict", message: body.message, current: body.current as T };
    }
    throw err;
  }
}

export const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Couldn't reach the Officium API.");
