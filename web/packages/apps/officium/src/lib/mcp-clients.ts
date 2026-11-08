/**
 * JDB-227 (in-app half): one setup snippet per MCP client, for the "Connect an agent" section of
 * Integrations (`/app/configuration/integrations`, JAVA-1629).
 *
 * This is a DELIBERATE duplicate of `javadaba-landing/src/lib/officium-mcp-clients.ts` (that
 * file's own header says as much: "written to be the SAME source... a different agent's card can
 * import"), not a cross-zone import: `packages/apps/officium` has no dependency edge to
 * `javadaba-landing`'s source tree, and the two apps share no package suited to holding product
 * content data (`@javadaba/account`/`analytics`/`brand`/`ui` are all purpose-built for something
 * else -- identity, telemetry, brand assets, design-system primitives -- not arbitrary docs data;
 * see the JDB-227/233 batch report for the survey). Coordinator's own fallback, taken here: kept
 * as a literal duplicate, with a test (`e2e/mcp-clients-sync.spec.ts`) that FAILS the moment the
 * two copies disagree -- so drift is caught at the same latency a shared import would give, without
 * a new inter-app dependency.
 *
 * The one real difference from landing's copy: the in-app panel needs the MCP URL for THIS
 * origin (dev's proxied `/api/officium/mcp`, not always `https://javadaba.com/...`), so every
 * snippet here is a function of `endpoint` instead of a baked-in literal. `officiumMcpClients(url)`
 * called with `OFFICIUM_MCP_ENDPOINT` (the same prod default landing hardcodes) is what the sync
 * test compares against landing's static array.
 */

export const OFFICIUM_MCP_ENDPOINT = "https://javadaba.com/api/officium/mcp";

export type OfficiumMcpSnippetLanguage = "bash" | "json" | "toml";

export interface OfficiumMcpClientGuide {
  id: string;
  /** Display name of the client/product. */
  label: string;
  /** One line: what this snippet does. */
  summary: string;
  /** Exact command or config block to paste, verified against `docUrl`. */
  snippet: string;
  language: OfficiumMcpSnippetLanguage;
  /** What happens next -- how the OAuth sign-in step actually gets triggered for this client. */
  afterPaste: string;
  /** The client's own current official documentation this snippet was checked against. */
  docUrl: string;
}

/** Every client's guide, built against one concrete endpoint URL. */
export function officiumMcpClients(endpoint: string): OfficiumMcpClientGuide[] {
  return [
    {
      id: "claude-code",
      label: "Claude Code",
      summary: "Add the server, then complete the OAuth sign-in from inside a session.",
      snippet: `claude mcp add --transport http officium ${endpoint}`,
      language: "bash",
      afterPaste:
        'Start (or resume) a Claude Code session and run "/mcp" — it opens your browser for the ' +
        "sign-in, then reports the connection as ready. Tokens are stored in your system keychain " +
        'and refresh on their own; "/mcp" is also where you revoke them locally (revoking the ' +
        "grant itself is done from Javadaba, see below).",
      docUrl: "https://code.claude.com/docs/en/mcp",
    },
    {
      id: "codex",
      label: "Codex CLI",
      summary: "Register the server, then sign in — or add it straight to config.toml.",
      snippet: `codex mcp add officium --url ${endpoint}\ncodex mcp login officium`,
      language: "bash",
      afterPaste:
        "The second command opens your browser for the OAuth sign-in. Equivalent, hand-written " +
        `config (~/.codex/config.toml):\n\n[mcp_servers.officium]\nurl = "${endpoint}"\n\n` +
        "No token or client id to fill in — Codex discovers the authorization server itself and " +
        "registers a client on first use.",
      docUrl: "https://learn.chatgpt.com/docs/extend/mcp?surface=cli",
    },
    {
      id: "cursor",
      label: "Cursor",
      summary: "Add the server to mcp.json; Cursor triggers the OAuth flow on first use.",
      snippet: `{
  "mcpServers": {
    "officium": {
      "url": "${endpoint}"
    }
  }
}`,
      language: "json",
      afterPaste:
        "Save as .cursor/mcp.json (project) or ~/.cursor/mcp.json (every project), then open " +
        "Cursor's MCP settings — it registers a client automatically (Dynamic Client " +
        "Registration) and opens your browser for sign-in the first time a tool is called.",
      docUrl: "https://cursor.com/docs/mcp",
    },
    {
      id: "vscode",
      label: "VS Code",
      summary: "Add the server to mcp.json; VS Code opens a browser window on first connection.",
      snippet: `{
  "servers": {
    "officium": {
      "type": "http",
      "url": "${endpoint}"
    }
  }
}`,
      language: "json",
      afterPaste:
        'Save as .vscode/mcp.json in your workspace, or run "MCP: Open User Configuration" for ' +
        "every workspace. VS Code handles the OAuth flow itself and opens a browser window the " +
        "first time it connects — nothing else to fill in.",
      docUrl: "https://code.visualstudio.com/docs/agents/reference/mcp-configuration",
    },
    {
      id: "claude-connectors",
      label: "Claude (desktop & web)",
      summary: "Add it as a custom connector from Settings — no config file.",
      snippet: endpoint,
      language: "bash",
      afterPaste:
        'Settings → Connectors → "Add custom connector", paste the URL above and click Add, then ' +
        '"Connect" — that opens the OAuth sign-in in your browser. A Team or Enterprise ' +
        "workspace adds it once from Organization settings → Connectors and each member connects " +
        "their own account from there.",
      docUrl:
        "https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp",
    },
  ];
}

/** Landing's own default -- what the sync test compares against its static array. */
export const OFFICIUM_MCP_CLIENTS: OfficiumMcpClientGuide[] = officiumMcpClients(OFFICIUM_MCP_ENDPOINT);
