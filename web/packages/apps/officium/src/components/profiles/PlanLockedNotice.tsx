"use client";

import { trackConversion } from "@javadaba/analytics";
import { Text } from "@javadaba/ui";

import { planHref } from "../../lib/billing/plan-link";
import { useCopy } from "../../lib/i18n/use-copy";

/** The notice the locked controls point at with `aria-describedby`: one per page (JAVA-1007). */
export const PLAN_LOCKED_ID = "plan-locked-notice";

/**
 * Why the owner cannot change this project's roles, and the one action that lets them: the Personal plan. A lapsed
 * owner is also told that what they saved stays, and comes back on subscribing.
 */
export function PlanLockedNotice({ overridesInactive }: { overridesInactive: boolean }) {
  const copy = useCopy().workProfile;
  return (
    <div
      id={PLAN_LOCKED_ID}
      role="note"
      data-testid="plan-locked-notice"
      className="flex flex-col items-start gap-2 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-4"
    >
      <Text as="p" className="text-sm font-medium">{copy.planLocked}</Text>
      {overridesInactive && <Text as="p" className="text-sm text-[color:var(--jd-muted)]">{copy.planKept}</Text>}
      <a
        href={planHref("personal_base_month")}
        onClick={() => trackConversion("upgrade_roles")}
        className="flex min-h-11 flex-row items-center text-sm font-semibold underline"
      >
        {copy.planUpgrade}
      </a>
    </div>
  );
}
