import { headers } from "next/headers";

/**
 * This origin's MCP endpoint, read from the request so it is right from the first byte (JDB-227): a server component
 * reads it, not `window.location`, which would flash the wrong URL on first paint and mismatch during SSR.
 * `https://javadaba.com/api/officium/mcp` behind Traefik in prod, `http://localhost:3016/api/officium/mcp` (or whatever
 * port/host the request arrived on) in dev/preview: the same `/api/*` same-origin convention `next.config.ts` relies on.
 */
export async function mcpEndpoint(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "javadaba.com";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}/api/officium/mcp`;
}
