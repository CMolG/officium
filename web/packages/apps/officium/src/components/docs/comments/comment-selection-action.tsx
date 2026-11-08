"use client";

import { MessageSquarePlus } from "lucide-react";
import { ToolbarButton, type SelectionAction } from "@javadaba/rich-text";

import type { Commenting } from "./use-commenting";

/**
 * Comment, in the floating toolbar over selected text (JAVA-797): after the formatting controls. It saves what is
 * pending first -- the server refuses a quote the stored page doesn't hold -- then takes the quote, keeps the
 * selection drawn and opens the panel on a new thread's composer.
 */
export function commentSelectionAction(commenting: Commenting, saveFirst: () => Promise<void>): SelectionAction {
  return {
    id: "comment",
    render: () => (
      <ToolbarButton
        title="Comment"
        icon={MessageSquarePlus}
        unavailable={commenting.anchors.quoteOfSelection() ? undefined : "Select some words to comment on"}
        onClick={() => {
          const picked = commenting.anchors.quoteOfSelection();
          if (!picked) return;
          // A save that failed is said by the editor's own status line; the post then answers `quote_not_found`.
          void saveFirst().catch(() => undefined).then(() => commenting.startComposing(picked.quote, { from: picked.from, to: picked.to }));
        }}
      />
    ),
  };
}
