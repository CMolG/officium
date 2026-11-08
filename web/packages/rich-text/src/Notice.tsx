import type { ReactNode } from "react";

/** A line above the text saying why it looks the way it does. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="border-b border-[color:var(--jd-line)] bg-[color:var(--jd-ink)]/[0.03] px-3 py-2 text-xs text-[color:var(--jd-muted)]">
      {children}
    </p>
  );
}
