"use client";

import { Progress, Text } from "@javadaba/ui";
import { TriangleAlert } from "lucide-react";

import { useCopy } from "../../lib/i18n/use-copy";

/** The id of the sentence that says where the quota stands; Save points at it so a disabled Save gives its reason (JAVA-1778). */
export const QUOTA_STATE_ID = "work-rules-quota-state";

/**
 * The live token count of the work rules against the project's quota (JAVA-1778). One sentence says where it stands,
 * and it is the only status region: it changes at thresholds, so typing does not speak on every key.
 */
export function WorkRulesQuota({ rules, total, quota, over }: { rules: number; total: number; quota: number; over: number }) {
  const { configuration } = useCopy();
  const copy = configuration.workRules;
  const left = quota - total;
  const state =
    over > 0 ? copy.quotaOver(over) : total >= quota * 0.9 ? copy.quotaClose(left) : copy.quotaLeft(left);

  return (
    <div className="flex flex-col gap-2">
      <Text className="text-sm font-medium">{copy.quotaCount(rules, total, quota)}</Text>
      <Progress
        value={Math.min(total, quota)}
        max={quota}
        aria-label={copy.quotaLabel}
        indicatorClassName={over > 0 ? "bg-destructive" : undefined}
      />
      <Text
        as="p"
        id={QUOTA_STATE_ID}
        role="status"
        className={over > 0 ? "flex flex-row items-start gap-2 text-sm font-medium text-destructive" : "text-sm text-[color:var(--jd-muted)]"}
      >
        {over > 0 && <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />}
        <span>{state}</span>
      </Text>
    </div>
  );
}
