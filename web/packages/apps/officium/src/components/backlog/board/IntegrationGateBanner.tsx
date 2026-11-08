import { Link } from "@javadaba/ui/navigation";
import { GitMerge } from "lucide-react";

import { Text } from "@javadaba/ui";

import type { GateView } from "../../../lib/autoloop/autoloop-types";
import { cardPath } from "../../../lib/backlog/search-links";
import { gateSettingsPath } from "./GateWhy";

export const GATE_BANNER_ID = "integration-gate-banner";

const ACTION = "inline-flex min-h-11 flex-row items-center justify-center rounded-[var(--radius-jd-control)] px-4 text-sm font-semibold sm:min-h-9";

/**
 * The autoloop stopped because the work it needs sits on the control branch, not in main (card://JAVA-1820): the
 * project's human has to merge it. Warning-toned (the warning wash, not the error red: nothing broke), full width, and not
 * dismissible, because it clears by itself when the server's gate closes. `role="alert"`: it appears while the
 * page is open. The primary action is the pull request when the server knows its address, else the merge card.
 */
export function IntegrationGateBanner({ gate, projectId }: { gate: GateView; projectId: string }) {
  const wall = gate.wallCard ? cardPath(projectId, gate.wallCard) : null;
  const primary = gate.compareUrl ? "pr" : wall ? "card" : null;
  return (
    <section
      id={GATE_BANNER_ID}
      role="alert"
      aria-labelledby={`${GATE_BANNER_ID}-title`}
      data-testid="integration-gate-banner"
      className="flex flex-col shrink-0 gap-3 bg-[color:var(--jd-warn-bg)] px-4 py-3 text-[color:var(--jd-ink)] sm:px-6 lg:flex-row lg:items-start lg:gap-6"
    >
      <span className="flex flex-row size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--jd-warn-solid)] text-black" aria-hidden="true">
        <GitMerge size={18} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Text as="h2" id={`${GATE_BANNER_ID}-title`} className="text-base font-semibold">
          Merge the control branch
          {gate.branch && (
            <>
              <span> </span>
              <code data-testid="integration-gate-branch" className="break-all rounded bg-[color:var(--jd-ink)]/10 px-1.5 py-0.5 font-mono text-sm font-medium">
                {gate.branch}
              </code>
            </>
          )}
        </Text>
        <Text as="p" className="text-sm">
          The autoloop stopped: the work it needs is on {gate.branch ? <code className="break-all font-mono">{gate.branch}</code> : "the control branch"}, not in main yet.
        </Text>
        {gate.reasons.length > 0 && (
          <ul data-testid="integration-gate-reasons" className="flex flex-col gap-0.5 pl-5 text-sm list-disc">
            {gate.reasons.map((reason) => (
              <li key={reason.rule}>
                <Text>{reason.message}</Text>
                {reason.cards.map((key) => (
                  <span key={key}>
                    <span> </span>
                    <Link href={cardPath(projectId, key)} className="whitespace-nowrap font-mono font-medium underline underline-offset-4 hover:no-underline">
                      {key}
                    </Link>
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
        <Text as="p" className="text-xs text-[color:var(--jd-muted)]">This clears on its own once the branch reaches main.</Text>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
        <Link href={gateSettingsPath(projectId)} data-testid="integration-gate-why" className={`${ACTION} border border-[color:var(--jd-control-border)] hover:bg-[color:var(--jd-hover)]`}>
          See why
        </Link>
        {primary && (
          <>
          {primary === "pr" ? (
            <a href={gate.compareUrl!} target="_blank" rel="noopener noreferrer" data-testid="integration-gate-primary" className={`${ACTION} bg-[color:var(--jd-warn-solid)] text-black hover:opacity-90`}>
              <Text>Open the pull request</Text>
            </a>
          ) : (
            <Link href={wall!} data-testid="integration-gate-primary" className={`${ACTION} bg-[color:var(--jd-warn-solid)] text-black hover:opacity-90`}>
              Open the merge card
            </Link>
          )}
          {primary === "pr" && wall && (
            <Link href={wall} data-testid="integration-gate-wall" className={`${ACTION} underline underline-offset-4 hover:no-underline`}>
              Open the merge card
            </Link>
          )}
          </>
        )}
      </div>
    </section>
  );
}
