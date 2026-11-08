import { ArrowUp } from "lucide-react";

import type { CardPrecedence } from "../../lib/backlog/precedence";

/**
 * "Raised by a rule" (Off-Vocab, "Precedence"): an arrow up and the ranking rule's name, one muted line cut with an
 * ellipsis on tiles; the title carries the full name (JAVA-1728).
 */
export function PrecedenceMark({ precedence }: { precedence?: CardPrecedence | null }) {
  if (!precedence) return null;
  return (
    <span
      title={precedence.name}
      data-testid="precedence-mark"
      className="inline-flex min-w-0 flex-row items-center gap-1 text-xs font-medium text-[color:var(--jd-muted)]"
    >
      <ArrowUp size={12} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{precedence.name}</span>
    </span>
  );
}
