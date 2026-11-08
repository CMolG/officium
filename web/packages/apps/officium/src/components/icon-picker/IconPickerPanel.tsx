"use client";

import { useState } from "react";
import { Input, Tabs, TabsList, TabsTrigger } from "@javadaba/ui";

import { isEmojiIcon } from "../../lib/docs/doc-node-rules";
import { readRecent, readSkinTone, rememberSkinTone, type RecentKind } from "../../lib/icons/recent-icons";
import type { SkinTone } from "../../lib/icons/skin-tone";
import { EmojiPane } from "./EmojiPane";
import { IconPane } from "./IconPane";
import type { PickerProps } from "./picker-types";
import { SelectionPreview } from "./SelectionPreview";
import { SkinToneSelect } from "./SkinToneSelect";

const KIND_OF = (value: string): RecentKind => (isEmojiIcon(value) ? "emoji" : "icons");

/**
 * The picker: one switch between Icons (Lucide) and Emoji, a search field for the open kind (with the skin
 * tone beside it for emoji), and the pane. It renders rows, not a wrapper: the dialog's body gives height to
 * the grid alone (JAVA-1765). The draft is `value`; choosing an option only reports it through `onPick`.
 */
export function IconPickerPanel({ value, onPick }: PickerProps) {
  const [kind, setKind] = useState<RecentKind>(() => KIND_OF(value));
  const [query, setQuery] = useState("");
  const [tone, setTone] = useState<SkinTone>(() => readSkinTone());
  const [recent] = useState(() => ({ icons: readRecent("icons"), emoji: readRecent("emoji") }));

  function changeTone(next: SkinTone) {
    setTone(next);
    rememberSkinTone(next);
  }

  const placeholder = kind === "icons" ? "Search icons" : "Search emoji, or paste one";
  const label = kind === "icons" ? "Search icons" : "Search emoji";

  return (
    <>
      <div className="flex shrink-0 flex-row items-center justify-between gap-3">
        <Tabs value={kind} onValueChange={(next) => setKind(next === "emoji" ? "emoji" : "icons")}>
          <TabsList className="h-auto">
            <TabsTrigger value="icons" className="min-h-11 px-4">
              Icons
            </TabsTrigger>
            <TabsTrigger value="emoji" className="min-h-11 px-4">
              Emoji
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <SelectionPreview value={value} />
      </div>
      <div className="flex shrink-0 flex-row items-center gap-2">
        <Input
          type="search"
          role="searchbox"
          aria-label={label}
          placeholder={placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-11 min-w-0 flex-1"
        />
        {kind === "emoji" && <SkinToneSelect value={tone} onChange={changeTone} />}
      </div>
      {kind === "icons" ? (
        <IconPane value={value} onPick={onPick} query={query} onClearQuery={() => setQuery("")} recent={recent.icons} />
      ) : (
        <EmojiPane
          value={value}
          onPick={onPick}
          query={query}
          onClearQuery={() => setQuery("")}
          recent={recent.emoji}
          tone={tone}
        />
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {value ? `Selected ${value}` : "Nothing selected"}
      </span>
    </>
  );
}
