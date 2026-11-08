"use client";

import { Undo2 } from "lucide-react";

import type { CardDetail } from "../../lib/backlog/types";
import { REVIEW_REWORK_CAP, reviewReworkStreak } from "../../lib/backlog/memory/review-rework";
import { CollapsedList } from "./Collapsed";
import { SectionHeading } from "./SectionHeading";
import { SentBackEntry } from "./SentBackEntry";

/** How many send-backs a card opens with, the most recent ones. */
const VISIBLE_RETURNS = 3;

/**
 * The card's send-back log (card://JAVA-1416), above its comments and only when it has entries: each time it was
 * sent back from review or deploy, by whom, why, and the findings. Newest first, the older ones behind a button.
 * While the rework streak is open, it says how many send-backs are left before the card escalates (card://JAVA-1443).
 */
export function SentBackSection({ detail }: { detail: CardDetail }) {
  const entries = detail.reviewReturns ?? [];
  if (entries.length === 0) return null;
  const streak = reviewReworkStreak(entries);
  return (
    <section aria-label="Sent back" data-testid="sent-back-section" className="flex flex-col gap-3">
      <SectionHeading icon={<Undo2 size={16} />}>Sent back · {entries.length}</SectionHeading>
      {streak > 0 && (
        <p className="text-sm text-[color:var(--jd-muted)]">{streak} of {REVIEW_REWORK_CAP} before a re-plan</p>
      )}
      <CollapsedList
        key={detail.id}
        className="flex flex-col gap-2"
        items={[...entries].reverse()}
        visible={VISIBLE_RETURNS}
        itemKey={(entry) => entry.id}
        moreLabel={(hidden) => `Show ${hidden} older send-back${hidden === 1 ? "" : "s"}`}
        renderItem={(entry) => <ul className="flex flex-col"><SentBackEntry entry={entry} detail={detail} /></ul>}
      />
    </section>
  );
}
