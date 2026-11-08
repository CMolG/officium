import { Link } from "@javadaba/ui/navigation";
import { Text } from "@javadaba/ui";

import { CATEGORY_CONFIG, CATEGORY_ORDER, categoryColor, categorySheetHref } from "../../lib/backlog/category-config";
import { namedCategories, parseGuide, type ParsedGuide } from "../../lib/backlog/category-guide-parse";
import type { Category } from "../../lib/backlog/types";

/**
 * What the category sheet and its info modal share (JAVA-518): the guide parsed into sections, a
 * category chip that leads to its sheet, and the ruled lists the contract is drawn with.
 */

const PARSED = new Map<Category, ParsedGuide>(CATEGORY_ORDER.map((id) => [id, parseGuide(CATEGORY_CONFIG[id].description)]));
const LABELS = Object.fromEntries(CATEGORY_ORDER.map((id) => [id, CATEGORY_CONFIG[id].label])) as Record<Category, string>;

export function parsedGuide(id: Category): ParsedGuide {
  return PARSED.get(id)!;
}

/** The guide's only inline Markdown is `code`: drawn as code, never as literal backticks. */
export function Inline({ text }: { text: string }) {
  return (
    <Text className="min-w-0 flex-1">
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="font-[family-name:var(--font-jd-kicker)] text-[0.9em]">
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

/** A category by its colour AND its name, leading to its sheet: 44 px, it is navigation. */
export function CategoryChip({ id }: { id: Category }) {
  return (
    <Link
      href={categorySheetHref(id)}
      data-testid="category-chip"
      data-category={id}
      className="flex min-h-11 max-w-full flex-row items-stretch gap-2 rounded-[var(--radius-jd-sm)] border border-[color:var(--jd-line)] py-1 pr-3 pl-2 text-sm font-semibold hover:border-[color:var(--jd-control-border)]"
    >
      <span aria-hidden="true" className="w-1 shrink-0 rounded-full" style={{ background: categoryColor(id) }} />
      <Text className="min-w-0 self-center break-words">{CATEGORY_CONFIG[id].label}</Text>
    </Link>
  );
}

/** A contract's items, each beside a hollow box: what a card has to show, not a checklist to tick. */
export function TickList({ items, labelledBy, glyph = "box" }: { items: string[]; labelledBy: string; glyph?: "box" | "dot" }) {
  return (
    <ul aria-labelledby={labelledBy} className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item} className="flex flex-row items-start gap-3 py-1">
          {glyph === "box" ? (
            <span aria-hidden="true" className="mt-1 size-4 shrink-0 rounded border-[1.5px] border-[color:var(--jd-control-border)]" />
          ) : (
            <Text aria-hidden="true" className="w-4 shrink-0 text-center font-[family-name:var(--font-jd-kicker)] font-bold text-[color:var(--jd-muted)]">
              ·
            </Text>
          )}
          <Inline text={item} />
        </li>
      ))}
    </ul>
  );
}

/** Where a look-alike belongs instead: each sentence, and every category it names as a chip. */
export function ExcludeList({ category, labelledBy }: { category: Category; labelledBy: string }) {
  return (
    <ul aria-labelledby={labelledBy} className="flex flex-col gap-2">
      {parsedGuide(category).excludes.map((sentence) => {
        const targets = namedCategories(sentence, LABELS, category);
        return (
          <li key={sentence} className="flex flex-row items-start gap-3 py-1">
            <Text aria-hidden="true" className="w-4 shrink-0 font-[family-name:var(--font-jd-kicker)] font-bold text-[color:var(--jd-muted)]">
              →
            </Text>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Inline text={sentence} />
              {targets.length > 0 && (
                <ul aria-label="Belongs instead in" className="flex flex-row flex-wrap gap-1.5">
                  {targets.map((target) => (
                    <li key={target} className="flex max-w-full flex-row">
                      <CategoryChip id={target} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
