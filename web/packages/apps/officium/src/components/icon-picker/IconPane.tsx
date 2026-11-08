"use client";

import { loadLucideSet } from "../../lib/icons/lucide-catalog";
import { useLazy } from "../../lib/icons/use-lazy";
import { IconBrowser } from "./IconBrowser";
import { PickerSkeleton } from "./PickerSkeleton";
import type { PickerProps } from "./picker-types";
import { PickerStatus } from "./PickerStatus";

export interface IconPaneProps extends PickerProps {
  query: string;
  onClearQuery: () => void;
  recent: string[];
}

/** The Lucide icons: loaded as one chunk the first time this pane opens. */
export function IconPane(props: IconPaneProps) {
  const set = useLazy(loadLucideSet);
  if (set.status === "failed") {
    return (
      <PickerStatus
        message="Couldn't load the icons. The connection probably dropped; nothing is wrong with your page."
        onRetry={set.retry}
      />
    );
  }
  if (set.status === "loading") return <PickerSkeleton label="Loading icons..." />;
  return <IconBrowser {...props} set={set.value} />;
}
