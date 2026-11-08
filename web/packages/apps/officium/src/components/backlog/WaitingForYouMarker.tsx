import { Hourglass } from "lucide-react";

/** "Waiting for you": an agent asked a person (Off-Vocab). The hourglass and the words, in the warning wash. */
export function WaitingForYouMarker() {
  return (
    <span className="inline-flex flex-row items-center gap-1 rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-warn-bg)] px-2 py-0.5 text-xs font-semibold text-[color:var(--jd-warn)]">
      <Hourglass size={11} className="shrink-0" aria-hidden="true" />
      Waiting for you
    </span>
  );
}
