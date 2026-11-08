"use client";

import { useEffect, useRef } from "react";
import { FileText } from "lucide-react";

import { SAMPLE_CARDS, sampleFile } from "./export-sample";

const FILE_LINES = sampleFile(SAMPLE_CARDS[0]).split("\n");
const TITLE_LINE = FILE_LINES.findIndex((line) => line.startsWith("# "));

/**
 * The project's list under its row, in three states: a skeleton while the sample loads, the three
 * cards, and then the cards that have left as files, one after another. The first file can be opened:
 * its Markdown is shown as the export writes it, and its pane scrolls on the scene's clock: to the
 * title (`scrolled` 1), then to the end, where the comment is (2). On a phone the list is a row of
 * chips and the keys only, so the file keeps the room it needs.
 */
export function ExportFiles({
  listed,
  filed,
  opened,
  scrolled,
}: {
  listed: boolean;
  filed: number;
  opened: boolean;
  scrolled: number;
}) {
  const paneRef = useRef<HTMLPreElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane) return;
    if (scrolled === 2) pane.scrollTop = pane.scrollHeight;
    else if (scrolled === 1) pane.scrollTop = titleRef.current?.offsetTop ?? 0;
    else pane.scrollTop = 0;
  }, [scrolled, opened]);

  if (!listed) {
    return (
      <div aria-busy="true" className="flex flex-col gap-2">
        <span className="sr-only">Loading the sample backlog</span>
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden="true" className="h-9 rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-line)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 @2xl:flex-row">
      <ul aria-label="Backlog" className="flex shrink-0 flex-wrap gap-1 @2xl:w-64 @2xl:flex-col">
        {SAMPLE_CARDS.map((card, i) =>
          i < filed ? (
            <li
              key={card.key}
              className="flex min-h-11 items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 text-sm"
            >
              <FileText size={14} aria-hidden="true" className="shrink-0 text-[color:var(--jd-muted)]" />
              <span className="whitespace-nowrap font-mono text-xs">{`${card.key}.md`}</span>
            </li>
          ) : (
            <li
              key={card.key}
              className="flex min-h-11 items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 text-sm"
            >
              <span className="shrink-0 whitespace-nowrap font-mono text-xs text-[color:var(--jd-muted)]">{card.key}</span>
              <span className="hidden min-w-0 truncate @2xl:inline">{card.title}</span>
            </li>
          ),
        )}
      </ul>
      {opened && (
        <pre
          ref={paneRef}
          data-scroll={scrolled}
          className="relative min-h-0 min-w-0 flex-1 overflow-auto whitespace-pre-wrap rounded-[var(--radius-jd-sm)] bg-[color:var(--jd-ink)]/[0.04] p-3 font-mono text-xs leading-relaxed"
        >
          {FILE_LINES.map((line, i) => (
            <span
              key={i}
              ref={i === TITLE_LINE ? titleRef : undefined}
              className="block"
            >
              {line || " "}
            </span>
          ))}
        </pre>
      )}
    </div>
  );
}
