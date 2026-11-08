import Link from "next/link";
import { Badge, Glyph } from "@javadaba/ui";

import { OFFICIUM_MCP_CLIENTS } from "@/lib/mcp-clients";

/**
 * "Connect an agent" in section 4's copy column (JAVA-1639): the client badges and the per-client
 * setup. The section's own close is its one "Open Officium", so this block carries no second
 * primary action.
 */
export function LandingConnect() {
  return (
    <div className="flex flex-col gap-4">
      <ul className="m-0 flex list-none flex-row flex-wrap gap-2 p-0" aria-label="Supported MCP clients">
        {OFFICIUM_MCP_CLIENTS.map((client) => (
          <li key={client.id}>
            <Badge register="tag" tone="neutral" fill="none" size="sm">
              {client.label}
            </Badge>
          </li>
        ))}
      </ul>
      <a
        href="/developers/docs/officium-mcp/setup"
        className="inline-flex min-h-11 flex-row items-center gap-2 text-sm font-semibold text-[color:var(--jd-ink)] underline-offset-4 hover:underline"
      >
        Setup per client
        <Glyph name="arrow-right" size={14} />
      </a>
      <Link
        href="/agents"
        className="inline-flex min-h-11 flex-row items-center gap-2 text-sm font-semibold text-[color:var(--jd-ink)] underline-offset-4 hover:underline"
      >
        Officium backlog over MCP for AI agents
        <Glyph name="arrow-right" size={14} />
      </Link>
    </div>
  );
}
