import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";

export type SlotState = "empty" | "filled" | "invalid" | "waiting";

const CHIP: Record<SlotState, { word: string; icon: ReactNode }> = {
  empty: { word: "Empty", icon: <CircleDashed size={14} aria-hidden="true" /> },
  filled: { word: "Set", icon: <CheckCircle2 size={14} aria-hidden="true" /> },
  invalid: { word: "Does not fit", icon: <AlertTriangle size={14} aria-hidden="true" /> },
  waiting: { word: "Waits", icon: <CircleDashed size={14} aria-hidden="true" /> },
};

/**
 * One of the two slots of a Refine card, in order (JAVA-1592): a numbered heading, a status chip with an icon and a
 * word (never colour alone), and the body.
 */
export function SlotFrame({ number, title, state, testId, children }: {
  number: number;
  title: string;
  state: SlotState;
  testId: string;
  children: ReactNode;
}) {
  const chip = CHIP[state];
  return (
    <section aria-label={title} data-testid={testId} data-state={state} className="flex flex-col gap-3">
      <header className="flex flex-row flex-wrap items-center gap-2">
        <h3 className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">{`${number}. ${title}`}</h3>
        <span className="flex flex-row items-center gap-1 text-xs font-medium">
          {chip.icon}
          {chip.word}
        </span>
      </header>
      {children}
    </section>
  );
}
