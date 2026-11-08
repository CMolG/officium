"use client";

import { useState } from "react";

import { Button, Text } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import { roleLabel } from "../../lib/backlog/role-config";
import { REVIEW_RETURN_REASONS } from "../../lib/backlog/review-returns";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import type { CardDetail, ReviewReturn } from "../../lib/backlog/types";

const reasonLabel = (id: string) => REVIEW_RETURN_REASONS.find((r) => r.id === id)?.label ?? id;

/** One send-back of the log: where it went, when, who and why, and its findings behind a button. */
export function SentBackEntry({ entry, detail }: { entry: ReviewReturn; detail: CardDetail }) {
  const [shown, setShown] = useState(false);
  const findings = entry.commentId ? detail.comments.find((c) => c.id === entry.commentId) : undefined;
  return (
    <li data-testid="sent-back-entry" className="flex min-w-0 flex-col gap-1 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
      <Text className="text-sm font-semibold">
        {STATUS_CONFIG[entry.from].label} → {STATUS_CONFIG[entry.to].label}
      </Text>
      <Text className="text-xs text-[color:var(--jd-muted)]">
        {formatDate(entry.at)} · {entry.by.name}{entry.role ? ` as ${roleLabel(entry.role)}` : ""}
      </Text>
      <Text className="text-sm">{entry.reasons.map(reasonLabel).join(" · ")}</Text>
      {findings ? (
        <>
          <Button type="button" register="ui" size="sm" variant="ghost" className="h-11 self-start" aria-expanded={shown}
            onClick={() => setShown((open) => !open)}>
            <Text>{shown ? "Hide findings" : "Findings"}</Text>
          </Button>
          {shown && <Text className="whitespace-pre-wrap text-sm">{findings.text}</Text>}
        </>
      ) : (
        <Text className="text-xs text-[color:var(--jd-muted)]">Findings comment deleted</Text>
      )}
    </li>
  );
}
