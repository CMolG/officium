"use client";

import { Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { useCopy } from "../../../lib/i18n/use-copy";
import type { CardDetail } from "../../../lib/backlog/types";

/** The rule that ranks the card, with its place in the project's list and a link to that rule's row (JAVA-1728). */
export function RankedByBlock({ detail }: { detail: CardDetail }) {
  const { rankedBy } = useCopy();
  const ranked = detail.precedence;
  if (!ranked) return null;
  return (
    <div>
      <h3 id="card-ranked-by-heading" className="mb-2 text-xs font-bold uppercase text-[color:var(--jd-muted)]">
        {rankedBy.heading}
      </h3>
      <div data-testid="card-ranked-by" className="flex flex-col gap-1">
        <Text as="p" className="text-sm font-semibold">
          {ranked.name}
        </Text>
        <Text as="p" className="text-xs text-[color:var(--jd-muted)]">
          {rankedBy.position(ranked.position, ranked.of)}
        </Text>
        <Text as="p" className="text-sm">
          {ranked.reason}
        </Text>
        <Link
          href={`/app/configuration/p/${detail.projectId}/precedence?rule=${ranked.ruleId}`}
          className="min-h-11 text-sm font-semibold underline underline-offset-2"
        >
          {rankedBy.link}
        </Link>
      </div>
    </div>
  );
}
