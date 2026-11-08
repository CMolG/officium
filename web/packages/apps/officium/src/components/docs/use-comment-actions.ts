import { useMemo } from "react";
import type { SelectionAction } from "@javadaba/rich-text";

import { commentSelectionAction } from "./comments/comment-selection-action";
import type { Commenting } from "./comments/use-commenting";

/** The editor's side of commenting (JAVA-797): the marks the threads leave in it, and the toolbar's Comment, which saves first. */
export function useCommentActions(commenting: Commenting | undefined, saveFirst: () => Promise<void>) {
  const anchors = commenting?.anchors;
  const extensions = useMemo(() => (anchors ? [anchors.extension] : undefined), [anchors]);
  const actions: SelectionAction[] | undefined =
    commenting && commenting.canWrite && !commenting.selectionReason ? [commentSelectionAction(commenting, saveFirst)] : undefined;
  return { extensions, actions };
}
