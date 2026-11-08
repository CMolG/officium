import type { Category } from "../../lib/backlog/types";
import { CATEGORY_CONFIG, categoryGroupKey } from "../../lib/backlog/category-config";

/** Just the glyph, for a place that writes the name beside it (the search results' column). */
export function CategoryIcon({ category, size = 14 }: { category: Category; size?: number }) {
  const Icon = CATEGORY_CONFIG[category].icon;
  return <Icon size={size} strokeWidth={2.25} className="shrink-0 text-[color:var(--jd-muted)]" aria-hidden="true" />;
}

/**
 * What kind of work a card is (JAVA-28, Off-Vocab): its icon on its group's tint AND its name, never the
 * icon alone -- fifteen glyphs are not a vocabulary anyone reads at a glance (`interface-psychology.md`
 * #4). The four groups (product, corrective, technical, research and quality) each have a tint, so the
 * kind of work reads in a column without repainting the tile. The hint (the user's own definition) rides
 * as the tooltip. Nothing while the card has no category: an empty marker would say "unclassified" on
 * every card of a backlog that predates categories.
 */
export function CategoryMarker({ category, className }: { category: Category | null; className?: string }) {
  if (!category) return null;
  const { label, icon: Icon, hint } = CATEGORY_CONFIG[category];
  const group = categoryGroupKey(category);
  return (
    <span
      data-testid="category-marker"
      data-category={category}
      data-category-group={group}
      title={hint}
      className={`flex max-w-full flex-row items-center gap-1.5 text-xs font-semibold text-[color:var(--jd-ink)] ${className ?? ""}`}
    >
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 flex-row items-center justify-center rounded-[6px]"
        style={{ background: `var(--officium-cat-${group})`, color: `var(--officium-cat-${group}-ink)` }}
      >
        <Icon size={12} strokeWidth={2.5} />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
