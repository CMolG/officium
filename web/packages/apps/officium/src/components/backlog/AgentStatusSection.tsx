import { Activity } from "lucide-react";

import { runsOn } from "../../lib/backlog/format";
import type { AgentWork } from "../../lib/backlog/types";

/**
 * What the agent working this card is doing right now, as it reports it (`cards.reportStatus`).
 * Monitoring only -- these lines are not comments and never reach the card's history, which is
 * why the section says so instead of looking like one more part of the record.
 */
export function AgentStatusSection({ work }: { work: AgentWork }) {
  const agent = work.actor.agentName ?? work.actor.name;
  const model = runsOn(work.model, work.effort);
  return (
    <section aria-label="Live agent status" className="rounded-[var(--radius-jd-lg)] border border-[color:var(--officium-agent)]/40 bg-[color:var(--officium-agent)]/[0.05] p-4">
      <h3 className="mb-3 flex flex-row flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold uppercase tracking-wide">
        <Activity size={16} className="text-[color:var(--officium-agent)]" aria-hidden="true" /> Live status
        <span className="text-xs font-medium normal-case tracking-normal text-[color:var(--jd-muted)]">
          {agent} is working on this card · not saved to its history
        </span>
        {/* What it runs on (JAVA-584), from its harness's heartbeat; absent until one says it. */}
        {model && (
          <span data-testid="agent-runs-on" className="rounded-[var(--radius-jd-pill)] border border-[color:var(--jd-line)] px-2 py-0.5 text-xs font-semibold normal-case tracking-normal text-[color:var(--jd-ink)]">
            {model}
          </span>
        )}
      </h3>
      {work.statuses.length === 0 ? (
        <p className="text-sm italic text-[color:var(--jd-muted)]">No status reported yet.</p>
      ) : (
        <ol aria-live="polite" className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
          {work.statuses.map((line, i) => (
            <li key={`${line.at}-${i}`} className={`flex flex-row gap-3 text-sm ${i === 0 ? "font-semibold text-[color:var(--jd-ink)]" : "text-[color:var(--jd-muted)]"}`}>
              <time dateTime={line.at} className="shrink-0 tabular-nums text-xs leading-5 text-[color:var(--jd-muted)]">
                {new Date(line.at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </time>
              <span className="min-w-0 text-pretty">{line.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
