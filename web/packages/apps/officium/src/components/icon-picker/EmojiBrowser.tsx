"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { Button, Text } from "@javadaba/ui";

import { isEmojiIcon } from "../../lib/docs/doc-node-rules";
import { EMOJI_GROUPS, emojiForTone, groupOfEmoji, type EmojiEntry } from "../../lib/icons/emoji-data";
import type { SkinTone } from "../../lib/icons/skin-tone";
import type { EmojiSet } from "../../lib/icons/emoji-catalog";
import { rankIcon, SEARCH_LIMIT } from "../../lib/icons/icon-search";
import { CategoryStrip } from "./CategoryStrip";
import { OptionGrid } from "./OptionGrid";
import { RecentRow } from "./RecentRow";
import type { GridOption } from "./picker-types";
import type { EmojiPaneProps } from "./EmojiPane";

/**
 * The emoji of the data this device draws, by group, or the search over them; one emoji pasted is offered as
 * is. It opens on the group of the saved emoji (JAVA-1765), and renders fragment rows like IconBrowser.
 */
export function EmojiBrowser({ set, value, onPick, query, onClearQuery, recent, tone }: EmojiPaneProps & { set: EmojiSet }) {
  const groups = EMOJI_GROUPS.filter((group) => set.entries.some((entry) => entry.group === group.id));
  const [group, setGroup] = useState(() => groupOfEmoji(set.entries, value) ?? groups[0]?.id ?? 0);
  const [, chooseGroup] = useTransition();
  const trimmed = useDeferredValue(query).trim();
  const searching = trimmed.length > 0;
  const shown = searching
    ? set.entries.filter((entry) => rankIcon(entry.label, entry.tags, trimmed) !== null).slice(0, SEARCH_LIMIT)
    : set.entries.filter((entry) => entry.group === group);
  const pasted: GridOption[] = searching && isEmojiIcon(trimmed) ? [{ id: trimmed, label: `Use ${trimmed}`, glyph: trimmed }] : [];
  const options = [...pasted, ...shown.map((entry) => entryOption(entry, tone))];
  const recentOptions: GridOption[] = recent.map((emoji) => ({ id: emoji, label: emoji, glyph: emojiGlyph(emoji) }));
  const groupTitle = groups.find((item) => item.id === group)?.title ?? "";
  const kicker = searching ? `${shown.length} emoji match "${trimmed}"` : `${groupTitle} · ${shown.length} emoji`;

  return (
    <>
      {!searching && recentOptions.length > 0 && <RecentRow label="Recent emoji" options={recentOptions} selected={value} onPick={onPick} />}
      {!searching && (
        <CategoryStrip
          label="Emoji categories"
          selected={String(group)}
          onChoose={(id) => chooseGroup(() => setGroup(Number(id)))}
          items={groups.map((item) => ({ id: String(item.id), title: item.title, glyph: item.glyph }))}
        />
      )}
      {searching && options.length === 0 ? (
        <div className="flex shrink-0 flex-col items-start gap-2" role="status">
          <Text size="sm">{`No emoji matches "${trimmed}". Try a shorter word, or paste one emoji.`}</Text>
          <Button type="button" register="ui" variant="ghost" onClick={onClearQuery}>
            Clear search
          </Button>
        </div>
      ) : (
        <>
          <Text id="emoji-grid-kicker" as="h3" size="xs" weight="bold" tone="muted" className="shrink-0">
            {kicker}
          </Text>
          <OptionGrid
            key={searching ? `search:${trimmed}` : `group:${group}`}
            labelledBy="emoji-grid-kicker"
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

const emojiGlyph = (emoji: string) => <span className="text-xl leading-none">{emoji}</span>;

const entryOption = (entry: EmojiEntry, tone: SkinTone): GridOption => {
  const glyph = emojiForTone(entry, tone);
  return { id: glyph, label: entry.label, glyph: emojiGlyph(glyph) };
};
