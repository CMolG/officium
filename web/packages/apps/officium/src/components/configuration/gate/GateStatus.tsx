"use client";

import { Badge, Panel, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { useAutoloop } from "../../../lib/autoloop/use-autoloop";
import { useCopy } from "../../../lib/i18n/use-copy";
import { cardPath } from "../../../lib/backlog/search-links";
import type { GateRules } from "../../../lib/configuration/integration-gate";

/**
 * The gate, live (Cfg-Rules "Integration gate"): closed, open or off, in words and shape, with every reason behind it.
 * When the server's gate trips, agents wait to integrate; the board's banner and the Autoloop button say the same.
 */
export function GateStatus({ projectId, rules }: { projectId: string; rules: GateRules }) {
  const t = useCopy().configuration.integrationGate.status;
  const { status, failed } = useAutoloop(projectId);
  const anyOn = rules.heldByDeploy.enabled || rules.deployQueue.enabled || rules.nothingElse.enabled;
  const gate = status?.gate ?? null;

  if (failed && !status) {
    return (
      <Panel material="plain" radius="lg" className="flex flex-col gap-1 p-5">
        <Text className="text-sm font-semibold">{t.checkFailed}</Text>
        <Text className="text-sm text-[color:var(--jd-muted)]">{t.checkFailedHelp}</Text>
      </Panel>
    );
  }
  if (!anyOn) {
    return (
      <Panel material="plain" radius="lg" className="flex flex-col items-start gap-2 p-5" data-testid="gate-status">
        <Badge register="chip" tone="neutral" fill="subtle">
          {t.off}
        </Badge>
        <Text className="text-base font-semibold">{t.noRules}</Text>
        <Text className="text-sm text-[color:var(--jd-muted)]">{t.noRulesHelp}</Text>
      </Panel>
    );
  }
  const closed = gate?.open === true;
  return (
    <Panel material="plain" radius="lg" className="flex flex-col items-start gap-3 p-5" data-testid="gate-status">
      <Badge register="chip" tone={closed ? "warning" : "success"} fill="subtle">
        {closed ? t.closed : t.open}
      </Badge>
      <Text className="text-base font-semibold">{closed ? t.closedTitle : t.openTitle}</Text>
      {closed && gate && gate.reasons.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {gate.reasons.map((reason) => (
            <li key={reason.rule} className="text-sm">
              <Text>{`${reason.message} `}</Text>
              {reason.cards.map((key) => (
                <Link key={key} href={cardPath(projectId, key)} className="font-mono font-medium underline underline-offset-4">
                  {key}
                </Link>
              ))}
            </li>
          ))}
        </ul>
      )}
      <Text className="text-sm text-[color:var(--jd-muted)]">{t.clears}</Text>
    </Panel>
  );
}
