"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { Button, Panel, Select, Tabs, TabsContent, TabsList, TabsTrigger, Text } from "@javadaba/ui";
import { copyText } from "@javadaba/sdk/platform";

import { useCopy } from "../../lib/i18n/use-copy";
import { officiumMcpClients } from "../../lib/mcp-clients";
import { AgentWindowsPanel } from "./AgentWindowsPanel";
import { HeartbeatPanel } from "./HeartbeatPanel";
import { IS_LOCAL } from "../../lib/edition";
import { CloudLocked } from "../cloud/CloudLocked";

const SAMPLE_PROMPT = 'Read project OFF and create cards for this plan: "…"';

/** One code block with its own copy button + 2s "Copied" feedback -- same pattern as the public
 *  product page's `McpSnippet.tsx`, generalized to any block of text. */
function CopyBlock({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    // Refused or unavailable: the text is still selectable.
    if (!(await copyText(text))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-row items-start gap-2 rounded-[var(--radius-jd-md)] bg-[color:var(--jd-card)] py-3 pl-4 pr-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-[family-name:var(--font-jd-kicker)] text-sm leading-relaxed text-[color:var(--jd-ink)]">
        {text}
      </code>
      <Button type="button" register="ui" variant="ghost" size="sm" onClick={() => void handleCopy()} aria-label={`Copy ${label}`}>
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

export interface ConnectAgentPanelProps {
  /** This origin's own MCP endpoint -- `https://javadaba.com/api/officium/mcp` in prod, computed
   *  server-side from the request in dev/preview (see `lib/connect/mcp-endpoint.ts`). */
  endpoint: string;
}

/** The agent connection, as the Connect an agent section of Integrations (JAVA-1629). Account-scoped: no project in it. */
export function ConnectAgentPanel({ endpoint }: ConnectAgentPanelProps) {
  const clients = officiumMcpClients(endpoint);
  const [client, setClient] = useState(clients[0]?.id);
  const copy = useCopy().configuration.integrations;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="connect-agent-heading">
      <div className="flex flex-col gap-1">
        <h2 id="connect-agent-heading" className="text-lg font-bold">
          {copy.agentHeading}
        </h2>
        <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-muted)]">
          Any MCP client can read and write your backlog through Officium&apos;s MCP server. Add the
          server below, then follow the client&apos;s own sign-in step.
        </p>
        <p className="text-sm text-[color:var(--jd-muted)]">{copy.agentScope}</p>
      </div>

      <Panel material="plain" radius="lg" className="flex flex-col gap-2 p-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
          MCP server URL
        </span>
        <CopyBlock text={endpoint} label="the MCP server URL" />
      </Panel>

      <Panel material="plain" radius="lg" className="flex flex-col gap-4 p-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
          Setup, per client
        </span>
        <Tabs value={client} onValueChange={setClient}>
          {/* Narrow screens: the client tabs become a select (Cfg-Integrations, Phone). */}
          <Select
            aria-label="Client"
            value={client}
            onChange={setClient}
            options={clients.map((c) => ({ value: c.id, label: c.label }))}
            className="min-h-11 w-full sm:hidden"
          />
          <TabsList className="hidden h-auto flex-row flex-wrap justify-start gap-1 sm:flex">
            {clients.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {clients.map((c) => (
            <TabsContent key={c.id} value={c.id} className="flex flex-col gap-3 pt-3">
              <p className="text-sm text-[color:var(--jd-muted)]">{c.summary}</p>
              <CopyBlock text={c.snippet} label={`the ${c.label} setup command`} />
              <p className="text-pretty text-sm text-[color:var(--jd-ink)]">{c.afterPaste}</p>
              <a
                href={c.docUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-row w-fit items-center gap-1 text-xs font-medium text-[color:var(--jd-muted)] underline underline-offset-4 hover:text-[color:var(--jd-ink)]"
              >
                <Text>{c.label}&apos;s own docs</Text> <ExternalLink size={11} aria-hidden="true" />
              </a>
            </TabsContent>
          ))}
        </Tabs>
      </Panel>

      <Panel material="plain" radius="lg" className="flex flex-col gap-3 p-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
          Two tools: discover, then query
        </span>
        <p className="max-w-prose text-pretty text-sm text-[color:var(--jd-ink)]">
          Officium&apos;s MCP surface is deliberately small: <strong>discover</strong> lists every
          operation (a key, what it does, its input shape, and an example) — call it first, or
          whenever you need a reminder. <strong>query</strong> runs one operation by key with its
          params, returning the same data the web app itself reads and writes. There is nothing
          else to learn.
        </p>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-[color:var(--jd-muted)]">Try a prompt like:</span>
          <CopyBlock text={SAMPLE_PROMPT} label="the sample prompt" />
        </div>
      </Panel>

      <HeartbeatPanel heartbeatUrl={endpoint.replace(/\/mcp$/, "/v1/heartbeat")} />

      {IS_LOCAL ? <CloudLocked feature="agentWindows" /> : <AgentWindowsPanel />}

      <a
        href="/account"
        className="flex flex-row w-fit items-center gap-1 text-sm font-medium underline underline-offset-4"
      >
        <Text>Manage connected agents on your account</Text> <ExternalLink size={12} aria-hidden="true" />
      </a>
    </section>
  );
}
