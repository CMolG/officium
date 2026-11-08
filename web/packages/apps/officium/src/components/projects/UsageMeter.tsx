import { Glyph } from "@javadaba/ui";

import { formatDate } from "../../lib/backlog/format";
import type { StorageUsage } from "../../lib/backlog/storage-usage";

const PLAN_NAMES = { free: "Free plan", personal: "Personal plan", business: "Business plan" } as const;

/** 70% and 90% say so in words (Off-Home, "Warnings at 70% and 90%"), never by the bar's color alone. */
function warning(percent: number, ended: boolean): string | null {
  if (ended) return "Over the Free space. Nothing is deleted; new files wait until you renew.";
  if (percent >= 90) return `${Math.floor(percent)}% used. New cards stop at 100%.`;
  if (percent >= 70) return `${Math.floor(percent)}% used. More room comes from storage you add to your account.`;
  return null;
}

/**
 * The allowance (JDB-241/245): card data of the account's own projects against what Officium has --
 * its own free 15 MB, plus what is left of the account's shared pool when it has bought or earned
 * space. The meter names the plan, its figures and, from 70%, what is about to happen. Attached files are
 * not in it (they live on the project's machine) and neither are the other apps' bytes, so the title says
 * both: a person who just attached a 9 MB PDF would otherwise expect the bar to jump.
 */
export function UsageMeter({
  usage,
  barClassName = "h-1.5 w-40",
}: {
  usage: StorageUsage;
  barClassName?: string;
}) {
  const mb = (bytes: number) => bytes / 1_000_000;
  const percent = Math.min(100, (usage.usedBytes / Math.max(1, usage.limitBytes)) * 100);
  const used = mb(usage.usedBytes);
  const shared = usage.sharedBytes > 0;
  const ended = Boolean(usage.planEndedAt);
  if (usage.unlimited) {
    return (
      <span className="text-xs font-medium text-[color:var(--jd-muted)]">
        {used < 0.1 ? used.toFixed(2) : used.toFixed(1)} MB of card data · no limit
      </span>
    );
  }
  const plan = usage.plan ? PLAN_NAMES[usage.plan] : shared ? null : PLAN_NAMES.free;
  const heading = ended && usage.planEndedAt ? `${plan ?? "Plan"} · ended ${formatDate(usage.planEndedAt)}` : plan;
  const note = warning(percent, ended);
  return (
    <div
      className="flex min-w-0 flex-col gap-1"
      title={
        "Attached files don't count: they stay on the project's machine."
        + (shared ? " The space you bought is shared with your other Javadaba apps." : "")
      }
    >
      <span className="text-xs font-medium text-[color:var(--jd-muted)]">
        {heading && <b className="font-semibold text-[color:var(--jd-ink)]">{heading} · </b>}
        {used < 0.1 ? used.toFixed(2) : used.toFixed(1)} MB of {mb(usage.limitBytes).toFixed(0)} MB of card data
      </span>
      <span
        role="meter"
        aria-label="Card data used"
        aria-valuemin={0}
        aria-valuemax={usage.limitBytes}
        aria-valuenow={usage.usedBytes}
        className={`${barClassName} overflow-hidden rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-bone)]`}
      >
        <span
          className={`block h-full ${percent >= 90 ? "bg-[color:var(--jd-bad)]" : percent >= 70 ? "bg-[color:var(--jd-warn-solid)]" : "bg-[color:var(--jd-accent)]"}`}
          style={{ width: `${Math.max(percent, usage.usedBytes > 0 ? 1 : 0)}%` }}
        />
      </span>
      {note && (
        <span className="flex flex-row items-start gap-1.5 text-xs text-[color:var(--jd-ink)]">
          <Glyph name="alert-triangle" size={13} className="mt-px shrink-0 text-[color:var(--jd-warn)]" />
          <span>{note}</span>
        </span>
      )}
    </div>
  );
}
