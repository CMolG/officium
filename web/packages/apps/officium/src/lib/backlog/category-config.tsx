import {
  Astroid,
  Bug,
  Crown,
  Factory,
  Flame,
  GraduationCap,
  HeartPulse,
  LayoutList,
  LockKeyhole,
  NotebookPen,
  PencilRuler,
  RefreshCw,
  Rocket,
  ScrollText,
  Summary,
  type LucideIcon,
} from "lucide-react";

import categoryGuide from "./category-guide.json";
import type { Category, CategoryGuideEntry } from "./types";

/**
 * What kind of work a card is (user request, 2026-09-23, JAVA-28): the user's fifteen categories,
 * each with the lucide icon they chose, in the four groups they defined them in. The one source
 * for every surface that draws one -- the card face, the modal, the create dialog, the filter and
 * the search -- so a category reads the same wherever it appears.
 *
 * What a category MEANS is the server's (JAVA-293, `CategoryGuide.java`, served by `meta.states`):
 * `hint` is the one line a picker shows under the name, so choosing between "Bug", "Hotfix" and
 * "Regression" needs no glossary elsewhere, and `description` is the Markdown that says which
 * cards belong and the rules they follow. They come from `category-guide.json`, a copy of that
 * source that `scripts/test/officium-category-guide.test.mjs` keeps identical to it.
 */
export interface CategoryConfig {
  id: Category;
  label: string;
  icon: LucideIcon;
  hint: string;
  description: string;
}

const GUIDE = new Map((categoryGuide as CategoryGuideEntry[]).map((entry) => [entry.id, entry]));

/** The card's top border for a category (JAVA-46) -- `theme-tokens.css` holds the values. */
export function categoryColor(id: Category): string {
  return `var(--officium-category-${id})`;
}

export interface CategoryGroup {
  label: string;
  categories: Category[];
}

export const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  { label: "Product and user value", categories: ["epic", "feature", "userStory", "enhancement"] },
  { label: "Corrective and stability", categories: ["bug", "hotfix", "regression"] },
  { label: "Technical and platform", categories: ["refactor", "technicalDebt", "infrastructure", "security"] },
  { label: "Research and quality", categories: ["spike", "testing", "routine", "documentation"] },
];

/** The four groups' keys, in the order above: the tint a category's marker wears (`theme-tokens.css`). */
const GROUP_KEYS = ["product", "corrective", "technical", "research"] as const;
export type CategoryGroupKey = (typeof GROUP_KEYS)[number];

export function categoryGroupKey(id: Category): CategoryGroupKey {
  return GROUP_KEYS[CATEGORY_GROUPS.findIndex((group) => group.categories.includes(id))]!;
}

export const CATEGORY_ORDER: Category[] = CATEGORY_GROUPS.flatMap((group) => group.categories);

/** A category's sheet (JAVA-518): its contract, and who works it. */
export function categorySheetHref(id: Category): string {
  return `/app/configuration/categories/${id}`;
}

/** Which of the four groups a category belongs to: the sheet's kicker. */
export function categoryGroup(id: Category): string {
  return CATEGORY_GROUPS.find((group) => group.categories.includes(id))!.label;
}

export function isCategory(id: string): id is Category {
  return (CATEGORY_ORDER as string[]).includes(id);
}

function category(id: Category, label: string, icon: LucideIcon): CategoryConfig {
  const { hint, description } = GUIDE.get(id)!;
  return { id, label, icon, hint, description };
}

export const CATEGORY_CONFIG: Record<Category, CategoryConfig> = {
  epic: category("epic", "Epic", Crown),
  feature: category("feature", "Feature", Rocket),
  userStory: category("userStory", "User story", PencilRuler),
  enhancement: category("enhancement", "Enhancement", Astroid),
  bug: category("bug", "Bug", Bug),
  hotfix: category("hotfix", "Hotfix", Flame),
  regression: category("regression", "Regression", RefreshCw),
  refactor: category("refactor", "Refactor", Summary),
  technicalDebt: category("technicalDebt", "Technical debt", NotebookPen),
  infrastructure: category("infrastructure", "Infrastructure", Factory),
  security: category("security", "Security", LockKeyhole),
  spike: category("spike", "Spike", GraduationCap),
  testing: category("testing", "Testing", HeartPulse),
  routine: category("routine", "Routine", LayoutList),
  documentation: category("documentation", "Documentation", ScrollText),
};

/** `meta.states`' `categoryGuide`, as the memory backend answers it: the same copy. */
export const CATEGORY_GUIDE: CategoryGuideEntry[] = CATEGORY_ORDER.map((id) => GUIDE.get(id)!);

/** A picker's "no category" entry: a `Select` option's value has to be some string. */
export const NO_CATEGORY = "none";

/** A picker's options, in the groups' order, each with its icon and its hint -- `Select` from
 *  `@javadaba/ui`. */
export function categoryOptions(iconSize = 14) {
  return CATEGORY_ORDER.map((id) => {
    const { label, icon: Icon, hint } = CATEGORY_CONFIG[id];
    return { value: id, label, description: hint, prefix: <Icon size={iconSize} aria-hidden="true" /> };
  });
}
