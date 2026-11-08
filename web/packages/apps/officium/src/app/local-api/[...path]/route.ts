import type { NextRequest } from "next/server";

import { IS_LOCAL } from "@/lib/edition";

/**
 * Officium Local's door to its API (the `/api/*` rewrite in `next.config.ts` lands here). The browser only ever
 * talks to this origin; this handler forwards the request to `OFFICIUM_API_URL` and, when `OFFICIUM_LOCAL_TOKEN` is
 * set, adds `Authorization: Bearer <token>` on the server, so the token never reaches the page. The body is streamed
 * both ways, which is what keeps the live event stream (SSE) alive.
 */
export const dynamic = "force-dynamic";

const DEFAULT_API = "http://127.0.0.1:8190";
/** Hop-by-hop or origin-bound headers that must not travel to the API. */
const DROPPED = ["host", "connection", "content-length", "cookie", "accept-encoding", "origin", "referer"];

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, { params }: Context): Promise<Response> {
  if (!IS_LOCAL) return new Response("Not found", { status: 404 });
  const { path } = await params;
  const base = (process.env.OFFICIUM_API_URL || DEFAULT_API).replace(/\/+$/, "");
  const target = `${base}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  for (const name of DROPPED) headers.delete(name);
  headers.set("accept-encoding", "identity");
  const token = process.env.OFFICIUM_LOCAL_TOKEN;
  if (token) headers.set("authorization", `Bearer ${token}`);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      signal: request.signal,
      // Node's fetch needs this to send a streamed request body.
      ...(hasBody ? { duplex: "half" } : {}),
    } as RequestInit);
    const out = new Headers(upstream.headers);
    out.delete("content-encoding");
    out.delete("content-length");
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
  } catch {
    return Response.json({ error: "The Officium Local API is not reachable.", api: base }, { status: 502 });
  }
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE, forward as HEAD, forward as OPTIONS };
