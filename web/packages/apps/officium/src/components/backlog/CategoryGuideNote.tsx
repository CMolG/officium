import { MarkdownView } from "@javadaba/rich-text";

import type { Category } from "../../lib/backlog/types";
import { CATEGORY_CONFIG } from "../../lib/backlog/category-config";

/**
 * Under the create dialog's category picker (JAVA-293): the chosen category's one line, then what
 * it asks of the card -- which cards belong in it and its rules. The same text an agent reads in
 * `meta.states`, so a person and an agent classify a card by the same definition. An existing
 * card's sidebar shows only the hint and reaches the rest through its info button (JAVA-520).
 */
export function CategoryGuideNote({ category }: { category: Category | null }) {
  if (!category) return null;
  const { hint, description } = CATEGORY_CONFIG[category];
  return (
    <div data-testid="category-guide" className="flex flex-col gap-1.5 text-xs text-[color:var(--jd-muted)]">
      <p>{hint}</p>
      <MarkdownView markdown={description} className="text-xs leading-relaxed text-[color:var(--jd-muted)]" />
    </div>
  );
}
