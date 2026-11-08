"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@javadaba/ui";

/**
 * The one piece of the product page that needs a client component: a copy button over the MCP
 * connection command. Everything else on `/officium` is a plain server component so the page
 * stays fully prerendered (JDB-228 acceptance: static build output).
 *
 * Syntax verified 2026-09-14 against Claude Code's own docs (`claude mcp add --transport http
 * <name> <url>`) -- not guessed.
 */
const COMMAND = "claude mcp add --transport http officium https://javadaba.com/api/officium/mcp";

export function McpSnippet() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard permission refused or unavailable -- the command is still selectable text. */
    }
  }

  return (
    <div className="flex flex-row items-center gap-2 rounded-[var(--radius-jd-md)] bg-[color:var(--jd-card)] py-2.5 pl-4 pr-2.5">
      {/* Wraps instead of scrolling (user report, 2026-09-15): a scrollbar under a one-line
          command read as a broken box. Breaks at the spaces first, and inside the URL only when
          a narrow column leaves no other choice. */}
      <code className="min-w-0 flex-1 whitespace-pre-wrap font-[family-name:var(--font-jd-kicker)] text-sm leading-relaxed text-[color:var(--jd-ink)] [overflow-wrap:anywhere]">
        {COMMAND}
      </code>
      <Button
        type="button"
        register="ui"
        variant="outline"
        size="sm"
        aria-label="Copy the MCP connection command"
        onClick={() => void handleCopy()}
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}
