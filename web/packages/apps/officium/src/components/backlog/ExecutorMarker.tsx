import { Bot, Lock, UserRound } from "lucide-react";

import { initialsOf } from "@javadaba/ui";

import type { Executor } from "../../lib/backlog/types";

/**
 * Who executes this card (Off-Vocab): icon AND text, on every card, never colour alone
 * (`.harness/rules/interface-psychology.md` #4; JDB-239 directive). An agent is a rounded square in
 * Officium's ramp with a bot in it; a person is a round disc, with the assignee's initials when there is
 * one. Shape tells them apart in grayscale, and the word says it too.
 */
export function ExecutorMarker({ executor, person }: { executor: Executor; person?: string }) {
  const isHuman = executor === "human";
  const initials = person ? initialsOf(person) : "";
  return (
    <span className="flex flex-row items-center gap-1.5 text-xs font-semibold text-[color:var(--jd-ink)]">
      {isHuman ? (
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 flex-row items-center justify-center rounded-full bg-[color:var(--jd-ink)] text-[9px] font-bold text-[color:var(--jd-page)]"
        >
          {initials || <UserRound size={11} />}
        </span>
      ) : (
        <span
          aria-hidden="true"
          className="flex size-5 shrink-0 flex-row items-center justify-center rounded-[6px] bg-[color:var(--officium-agent)]/15 text-[color:var(--officium-agent)]"
        >
          <Bot size={12} strokeWidth={2.5} />
        </span>
      )}
      <span>{isHuman ? "Person" : "AI agent"}</span>
    </span>
  );
}

/** Names the blocking keys instead of a bare "Blocked" label -- same rule, applied to the
 *  blocked-by marker: a lock and the key it waits on (Off-Vocab). One line that never overflows its
 *  card (JAVA-126): the flag is capped at its row and the text ends in an ellipsis; the whole list
 *  stays in the tooltip and in the card modal's Blocked by section. */
export function BlockedMarker({ blockedBy }: { blockedBy: string[] }) {
  if (blockedBy.length === 0) return null;
  const label = `Blocked by ${blockedBy.join(", ")}`;
  return (
    <span
      data-jd-badge=""
      className="inline-flex min-w-0 max-w-full flex-row items-center gap-1 rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-bad-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--jd-bad)]"
    >
      <Lock size={11} className="shrink-0" aria-hidden="true" />
      <span title={label} className="min-w-0 truncate">
        {label}
      </span>
    </span>
  );
}
