"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { Button, Text } from "@javadaba/ui";

import { isLucideIconId } from "../../lib/docs/doc-node-rules";
import { COMMON_CATEGORY, iconsOfCategory } from "../../lib/icons/common-icons";
import { canonicalIcon, SEARCH_LIMIT, searchIcons } from "../../lib/icons/icon-search";
import { componentName, type LucideSet } from "../../lib/icons/lucide-catalog";
import { CategoryStrip } from "./CategoryStrip";
import { OptionGrid } from "./OptionGrid";
import { RecentRow } from "./RecentRow";
import type { GridOption, PickerProps } from "./picker-types";

export interface IconBrowserProps extends PickerProps {
  set: LucideSet;
  query: string;
  onClearQuery: () => void;
  recent: string[];
}

const COMMON_ITEM = { id: COMMON_CATEGORY, title: "Common", icon: "star" };

/**
 * The icons of the installed Lucide: a category strip, a search, Recent, and the grid for what is chosen.
 * Fragment rows, so the grid is a direct child of the dialog's body (JAVA-1765). The grid is keyed by its
 * category or query, so a new one starts at its top.
 */
export function IconBrowser({ set, value, onPick, query, onClearQuery, recent }: IconBrowserProps) {
  const { metadata, icons } = set;
  const [category, setCategory] = useState(() => metadata.icons[value]?.c[0] ?? COMMON_CATEGORY);
  const [, chooseCategory] = useTransition();
  const trimmed = useDeferredValue(query).trim();
  const searching = trimmed.length > 0;
  const found = searching ? searchIcons(metadata, trimmed) : null;
  const ids = found ? found.ids : iconsOfCategory(metadata, category);
  const categories = [COMMON_ITEM, ...metadata.categories];
  const current = categories.find((item) => item.id === category);
  const glyph = (id: string) => {
    const Icon = icons[componentName(canonicalIcon(metadata, id) ?? id)];
    return Icon ? <Icon size={20} aria-hidden="true" /> : null;
  };
  const options: GridOption[] = ids.map((id) => ({ id, label: id.replace(/-/g, " "), glyph: glyph(id) }));
  const recentOptions: GridOption[] = recent.flatMap((id) => {
    const drawn = glyph(id);
    return drawn ? [{ id, label: id.replace(/-/g, " "), glyph: drawn }] : [];
  });
  const unavailable = isLucideIconId(value) && !canonicalIcon(metadata, value);
  const kicker = searching
    ? found && found.total > SEARCH_LIMIT
      ? `Showing the first ${SEARCH_LIMIT}. Add a word to narrow it.`
      : `${ids.length} icons match "${trimmed}"`
    : `${current?.title ?? ""} · ${ids.length} icons`;

  return (
    <>
      {unavailable && <Text size="sm" className="shrink-0">{`${value} isn't in this icon set. Pick another or keep it.`}</Text>}
      {!searching && recentOptions.length > 0 && <RecentRow label="Recent icons" options={recentOptions} selected={value} onPick={onPick} />}
      {!searching && (
        <CategoryStrip
          label="Icon categories"
          selected={category}
          onChoose={(id) => chooseCategory(() => setCategory(id))}
          items={categories.map((item) => ({ id: item.id, title: item.title, glyph: glyph(item.icon) }))}
        />
      )}
      {searching && ids.length === 0 ? (
        <div className="flex shrink-0 flex-col items-start gap-2" role="status">
          <Text size="sm">{`No icon matches "${trimmed}". Try a shorter word or pick a category.`}</Text>
          <Button type="button" register="ui" variant="ghost" onClick={onClearQuery}>
            Clear search
          </Button>
        </div>
      ) : (
        <>
          <Text id="icon-grid-kicker" as="h3" size="xs" weight="bold" tone="muted" className="shrink-0">
            {kicker}
          </Text>
          <OptionGrid
            key={searching ? `search:${trimmed}` : `category:${category}`}
            labelledBy="icon-grid-kicker"
            options={options}
            selected={value}
            onPick={onPick}
            className="h-72 min-h-36 shrink overflow-y-auto"
            testId="icon-grid"
          />
        </>
      )}
    </>
  );
}
