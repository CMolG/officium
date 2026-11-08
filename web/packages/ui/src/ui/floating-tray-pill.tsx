"use client";

import type { ReactNode } from "react";

import { Glyph } from "./glyph";

/** FloatingTray collapsed: one raised pill with the summary and a chevron that opens the tray. */
export function FloatingTrayPill({
  icon,
  summary,
  expandLabel,
  onToggle,
  target,
}: {
  icon?: ReactNode;
  summary: ReactNode;
  expandLabel: string;
  onToggle: () => void;
  /** `data-theater-target`, so a scene's ghost cursor can reach it. */
  target?: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={false}
      aria-label={expandLabel}
      onClick={onToggle}
      data-theater-target={target}
      data-slot="floating-tray-pill"
      className="pointer-events-auto flex min-h-12 animate-jd-sheet-in cursor-pointer flex-row items-center gap-3.5 rounded-[var(--radius-jd-pill)] border border-[color:var(--jd-line)] bg-[color:var(--jd-raised)] py-0 pr-2.5 pl-[18px] text-sm font-semibold text-[color:var(--jd-ink)] shadow-[var(--jd-shadow-overlay)] transition-colors duration-[var(--jd-dur-fast)] hover:bg-[color:var(--jd-card-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-focus)] motion-reduce:animate-none"
    >
      {icon}
      <span className="min-w-0 text-pretty">{summary}</span>
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 flex-row items-center justify-center rounded-[var(--radius-jd-pill)] bg-[color:var(--jd-card)]"
      >
        <Glyph name="chevron-up" size={16} />
      </span>
    </button>
  );
}
