import { SectionHead, Text } from "@javadaba/ui";

import { McpSnippet } from "@/components/marketing/McpSnippet";
import { OFFICIUM_MCP_CLIENTS } from "@/lib/mcp-clients";

/** The command that connects an agent, and the clients that have a setup guide. */
export function AgentsConnect() {
  return (
    <section id="connect" aria-label="Connect an agent" className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <SectionHead kicker="03 · Connect" title="How to connect an AI agent to Officium over MCP" />
      <div className="mt-6 flex max-w-prose flex-col gap-4">
        <Text type="body-l" tone="muted" className="text-pretty">
          Connecting is one command and one sign-in. There is no API key to create or rotate: the agent signs in with
          your Javadaba account through OAuth, the first time it uses the server. In Claude Code the command is:
        </Text>
        <McpSnippet />
        <Text tone="muted" className="text-pretty">
          Setup is written for {OFFICIUM_MCP_CLIENTS.map((client) => client.label).join(", ")}.{" "}
          <a href="/developers/docs/officium-mcp/setup" className="font-semibold underline underline-offset-4">
            Setup per client
          </a>{" "}
          and the{" "}
          <a href="/developers/docs/officium-mcp" className="font-semibold underline underline-offset-4">
            Officium MCP guide
          </a>{" "}
          have each command and what the client does after the paste.
        </Text>
      </div>
    </section>
  );
}
