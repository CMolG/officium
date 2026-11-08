"use client";

import { useState } from "react";
import { copyText } from "@javadaba/sdk/platform";
import { Button, Input } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";

/**
 * Where the pipeline token stands: the new one, shown once with a Copy (the plain token is never
 * kept), or whether a pipeline is connected and since when.
 */
export function PipelineTokenState({
  issued,
  configured,
  createdAt,
}: {
  issued: string | null;
  configured: boolean;
  createdAt: string | null;
}) {
  const [copied, setCopied] = useState(false);
  return issued ? (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold">Your new token</p>
      <p className="text-sm text-[color:var(--jd-muted)]">
        Copy it now and store it as a secret in your CI. It is not shown again.
      </p>
      <div className="flex flex-row gap-2">
        <Input readOnly value={issued} aria-label="Pipeline token" className="min-w-0 flex-1 font-mono text-xs" />
        <Button type="button" register="ui" variant="outline" onClick={async () => setCopied(await copyText(issued))}>
          <span>{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
    </div>
  ) : (
    <p className="text-sm">
      {configured
        ? `A pipeline is connected${createdAt ? ` (token created ${formatDate(createdAt)})` : ""}. A new token stops the current one at once.`
        : "No pipeline is connected yet."}
    </p>
  );
}
