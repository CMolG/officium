"use client";

import { useMemo } from "react";
import { Text } from "@javadaba/ui";

import { lineDiff } from "../../lib/docs/line-diff";

const SIGN = { add: "+", remove: "−", same: " " } as const;
const SIGN_WORD = { add: "Added", remove: "Removed", same: "Unchanged" } as const;

const plural = (n: number) => `${n} ${n === 1 ? "line" : "lines"}`;

/**
 * A kept version compared with the current one (JAVA-794): the lines only the kept version has are
 * struck with a minus, the lines only the current one has are marked with a plus. The signs carry
 * the meaning, so it reads in grayscale; the tint is only a second channel.
 */
export function RevisionDiff({ kept, current }: { kept: string; current: string }) {
  const diff = useMemo(() => lineDiff(kept, current), [kept, current]);
  return (
    <div className="flex flex-col gap-2" data-testid="revision-diff">
      <Text as="p" className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">
        {`Kept version → current · ${plural(diff.added)} added, ${plural(diff.removed)} removed`}
      </Text>
      {diff.added === 0 && diff.removed === 0 ? (
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          The text is the same as the current version.
        </Text>
      ) : (
        <ol className="flex flex-col overflow-hidden rounded-[var(--radius-jd-control)] bg-[color:var(--jd-raised)] font-mono text-xs">
          {diff.lines.map((line, index) => (
            <li
              key={index}
              data-kind={line.kind}
              className={`flex flex-row gap-2 px-2 py-0.5 ${
                line.kind === "add" ? "bg-[color:var(--jd-ok-bg)]" : line.kind === "remove" ? "bg-[color:var(--jd-bad-bg)] line-through" : ""
              }`}
            >
              <span aria-hidden="true" className="w-3 shrink-0 select-none">
                {SIGN[line.kind]}
              </span>
              <span className="sr-only">{SIGN_WORD[line.kind]}: </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{line.text || " "}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
