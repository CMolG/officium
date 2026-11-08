import type { LucideIcon } from "lucide-react";

import type { LucideMetadata } from "./icon-search";

export interface LucideSet {
  icons: Record<string, LucideIcon>;
  metadata: LucideMetadata;
}

/** Lucide's component name for an id: `arrow-big-up` is `ArrowBigUp`, as the package exports it. */
export const componentName = (id: string): string =>
  id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const cache: { set?: Promise<LucideSet> } = {};

/**
 * The whole Lucide set and its metadata, in one chunk loaded the first time the Icons pane opens. A failed
 * load is forgotten, so the next attempt imports again.
 */
export function loadLucideSet(): Promise<LucideSet> {
  cache.set ??= Promise.all([import("lucide-react"), import("./lucide-metadata.json")]).then(
    ([lucide, metadata]) => ({ icons: lucide.icons, metadata: metadata.default }),
    (error: unknown) => {
      cache.set = undefined;
      throw error;
    },
  );
  return cache.set;
}
