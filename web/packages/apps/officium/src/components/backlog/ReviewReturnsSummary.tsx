"use client";

import { Undo2 } from "lucide-react";

import { Text } from "@javadaba/ui";

import type { ReviewReturnMetrics } from "../../lib/backlog/types";
import { CATEGORY_CONFIG } from "../../lib/backlog/category-config";
import { REVIEW_RETURN_REASONS } from "../../lib/backlog/review-returns";

const reasonLabel = (id: string) => REVIEW_RETURN_REASONS.find((r) => r.id === id)?.label ?? id;

/**
 * What reviews sent back in the period (card://JAVA-1416), by reason and by kind of work, and how many of the
 * cards that passed review did so the first time: where reviews fail, read in the same place as what was
 * delivered. A return naming several reasons counts once for each, so the reasons can add up to more than the total.
 */
export function ReviewReturnsSummary({ reviewReturns }: { reviewReturns: ReviewReturnMetrics | undefined }) {
  const total = reviewReturns?.total ?? 0;
  const pass = reviewReturns?.firstTimePass;
  return (
    <section data-testid="review-returns-summary">
      <h2 className="mb-2 flex flex-row items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[color:var(--jd-muted)]">
        <Undo2 size={13} aria-hidden="true" />
        <Text>Sent back</Text>
      </h2>
      {pass && pass.passed > 0 && (
        <Text data-testid="first-time-pass" className="mb-2 block text-sm">
          {pass.firstTime} of {pass.passed} {pass.passed === 1 ? "card" : "cards"} passed review the first time
          {pass.share !== null ? ` (${Math.round(pass.share * 100)}%)` : ""}.
        </Text>
      )}
      {!reviewReturns || total === 0 ? (
        <Text className="text-sm text-[color:var(--jd-muted)]">No card was sent back in this period.</Text>
      ) : (
        <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-8">
          <Text className="text-2xl font-black">{total}</Text>
          <ul aria-label="Sent back by reason" className="flex flex-col gap-1">
            {reviewReturns.byReason.map((row) => (
              <li key={row.reason} className="flex flex-row gap-2">
                <Text className="font-medium">{reasonLabel(row.reason)}</Text>
                <Text className="text-[color:var(--jd-muted)]">{row.count}</Text>
              </li>
            ))}
          </ul>
          <ul aria-label="Sent back by category" className="flex flex-col gap-1">
            {reviewReturns.byCategory.map((row) => (
              <li key={row.category ?? "none"} className="flex flex-row gap-2">
                <Text className="font-medium">{row.category ? CATEGORY_CONFIG[row.category].label : "No category"}</Text>
                <Text className="text-[color:var(--jd-muted)]">{row.count}</Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
