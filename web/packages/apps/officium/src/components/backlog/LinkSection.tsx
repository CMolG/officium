"use client";

import type { BoardCard } from "../../lib/backlog/board-copy";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";
import { StatusShape } from "./StatusShape";

export function LinkSection({
  title,
  keys,
  allCards,
  onOpenOther,
}: {
  title: string;
  keys: string[];
  allCards: BoardCard[];
  onOpenOther: (cardId: string) => void;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--jd-muted)]">{title}</h4>
      <div className="flex flex-col gap-2">
        {keys.map((key) => {
          const rel = allCards.find((c) => c.key === key);
          if (!rel) return null;
          const relStatus = STATUS_CONFIG[rel.status];
          return (
            <button
              key={key}
              onClick={() => onOpenOther(rel.id)}
              className="flex flex-row min-h-11 items-center justify-between gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3 text-left transition-colors hover:border-[color:var(--jd-ink)]/40"
            >
              <span className="flex flex-row min-w-0 items-center gap-3">
                <span className="shrink-0 rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.06] px-2 py-1 font-[family-name:var(--font-jd-kicker)] text-xs uppercase tracking-widest">{key}</span>
                <span className="truncate text-sm font-semibold">{rel.title}</span>
              </span>
              <StatusShape status={rel.status} className="size-4 shrink-0" title={relStatus.label} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
