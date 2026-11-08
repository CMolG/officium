import { AlarmClock } from "lucide-react";

/**
 * Why a person's card waits (Off-Vocab, "Wake reason"): a blue chip with an alarm clock and the reason in words,
 * from the project's closed list. Blue on purpose, so it never reads as a warning -- a card that waits for the
 * client is not a card in trouble.
 */
export function WakeReasonMark({ reason }: { reason?: string | null }) {
  if (!reason) return null;
  return (
    <span
      data-testid="wake-reason"
      className="inline-flex min-w-0 max-w-full flex-row items-center gap-1 rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-info-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--jd-info)]"
    >
      <AlarmClock size={11} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{reason}</span>
    </span>
  );
}
