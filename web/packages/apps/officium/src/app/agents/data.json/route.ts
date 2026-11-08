import { AGENTS_DATA } from "@/lib/agents/agents-data";

/**
 * `/officium/agents/data.json`: the figures of the page at a stable address, so others can cite them (JAVA-2040).
 * The same object the page renders, with its date; served statically.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(AGENTS_DATA, { headers: { "Cache-Control": "public, max-age=3600" } });
}
