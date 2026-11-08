"use client";

import { Text } from "@javadaba/ui";

import { isEmojiIcon } from "../../lib/docs/doc-node-rules";
import { loadEmojiSet } from "../../lib/icons/emoji-catalog";
import { entryOfEmoji } from "../../lib/icons/emoji-data";
import { useLazy } from "../../lib/icons/use-lazy";
import { DocNodeIcon } from "../docs/DocNodeIcon";

/** The name of a saved emoji from its data; the glyph until that data loads, and for an emoji it does not know. */
function EmojiName({ value }: { value: string }) {
  const set = useLazy(loadEmojiSet);
  const entry = set.status === "ready" ? entryOfEmoji(set.value.entries, value) : undefined;
  return entry?.label ?? value;
}

/** The draft in one line: the glyph, its name and its kind. Nothing is saved until the dialog saves. */
export function SelectionPreview({ value }: { value: string }) {
  if (!value) {
    return (
      <Text size="sm" tone="muted">
        No icon selected
      </Text>
    );
  }
  const name = isEmojiIcon(value) ? <EmojiName value={value} /> : value;
  return (
    <div className="flex min-w-0 flex-row items-center gap-2">
      <DocNodeIcon icon={value} color={null} isSection={false} size={20} />
      <Text size="sm" weight="bold" className="min-w-0 truncate" title={value}>
        {name}
      </Text>
      <Text size="xs" tone="muted" className="shrink-0">
        {isEmojiIcon(value) ? "Emoji" : "Icon"}
      </Text>
    </div>
  );
}
