"use client";

import { Link } from "@javadaba/ui/navigation";

import { Button, Text } from "@javadaba/ui";

import type { GateView } from "../../../lib/autoloop/autoloop-types";
import { CONFIGURATION_ROOT } from "../../../lib/configuration/places";
import { useCopy } from "../../../lib/i18n/use-copy";
import { cardPath } from "../../../lib/backlog/search-links";

/** Where the gate's rules are set: the project's Configuration page. */
export const gateSettingsPath = (projectId: string) => `${CONFIGURATION_ROOT}/p/${projectId}/integration-gate`;

/**
 * Why the gate is closed (Off-Board, "When the loop waits, the board says why"): each reason with the rule that raised it,
 * the way to the rules, and, while the loop is running, Stop the loop. It is the body of the Autoloop button's popover.
 */
export function GateWhy({ gate, projectId, onStop }: { gate: GateView; projectId: string; onStop?: () => void }) {
  const { rules } = useCopy().configuration.integrationGate;
  return (
    <div data-testid="gate-why" className="flex flex-col gap-3">
      <Text as="p" className="text-sm font-semibold">The integration gate is closed.</Text>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {gate.reasons.map((reason) => (
          <li key={reason.rule} className="flex flex-col gap-0.5 text-sm">
            <Text className="text-xs font-semibold uppercase tracking-wide text-[color:var(--jd-muted)]">{rules[reason.rule].title}</Text>
            <span>
              <Text>{reason.message}</Text>
              {reason.cards.map((key) => (
                <span key={key}>
                  <span> </span>
                  <Link href={cardPath(projectId, key)} className="font-mono font-medium underline underline-offset-4">
                    {key}
                  </Link>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-row flex-wrap items-center gap-2">
        <Button asChild register="ui" variant="outline" size="sm" className="min-h-11 sm:min-h-0">
          <Link href={gateSettingsPath(projectId)}>Integration gate rules</Link>
        </Button>
        {onStop && (
          <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 sm:min-h-0" onClick={onStop}>
            Stop the loop
          </Button>
        )}
      </div>
    </div>
  );
}
