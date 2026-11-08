import { LoaderCircle } from "lucide-react";

/** "Working now" on a card an agent works right now (JAVA-118, Off-Vocab): never the moving border alone, icon and text too. */
export function WorkingNowMarker() {
  return (
    <span className="inline-flex flex-row items-center gap-1 rounded-[var(--radius-jd-pill)] bg-[color:var(--officium-agent)]/10 px-2 py-0.5 text-xs font-semibold text-[color:var(--jd-ink)]">
      <LoaderCircle size={11} className="text-[color:var(--officium-agent)]" aria-hidden="true" />
      Working now
    </span>
  );
}
