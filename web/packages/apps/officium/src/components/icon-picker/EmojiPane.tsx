"use client";

import { loadEmojiSet } from "../../lib/icons/emoji-catalog";
import type { SkinTone } from "../../lib/icons/skin-tone";
import { useLazy } from "../../lib/icons/use-lazy";
import { EmojiBrowser } from "./EmojiBrowser";
import { PickerSkeleton } from "./PickerSkeleton";
import type { PickerProps } from "./picker-types";
import { PickerStatus } from "./PickerStatus";

export interface EmojiPaneProps extends PickerProps {
  query: string;
  onClearQuery: () => void;
  recent: string[];
  tone: SkinTone;
}

/** The emoji: their data loads as one chunk the first time this pane opens. */
export function EmojiPane(props: EmojiPaneProps) {
  const set = useLazy(loadEmojiSet);
  if (set.status === "failed") {
    return (
      <PickerStatus
        message="Couldn't load the emoji. The connection probably dropped; nothing is wrong with your page."
        onRetry={set.retry}
      />
    );
  }
  if (set.status === "loading") return <PickerSkeleton label="Loading emoji..." />;
  return <EmojiBrowser {...props} set={set.value} />;
}
