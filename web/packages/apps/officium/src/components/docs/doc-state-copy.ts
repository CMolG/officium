import { Archive, FilePen, Trash2 } from "lucide-react";

import type { DocListState } from "../../lib/backlog/types";

/** What each lifecycle list says about itself, including what an empty one invites you to do. */
export const DOC_STATE_COPY: Record<DocListState, { heading: string; blurb: string; empty: string; emptyHint: string; icon: typeof Archive }> = {
  unpublished: {
    heading: "Unpublished drafts",
    blurb: "Pages only you can see. They reach the rest of the project, and its agents, when you publish them.",
    empty: "No unpublished drafts",
    emptyHint: "A page you create starts here, hidden from everyone else until you publish it.",
    icon: FilePen,
  },
  archived: {
    heading: "Archive",
    blurb: "Pages taken out of the tree and the search, but kept. Anyone can still open one by its address.",
    empty: "Nothing is archived",
    emptyHint: "Archive a page to hide it from the tree without deleting it. Unarchive brings it back.",
    icon: Archive,
  },
  trash: {
    heading: "Trash",
    blurb: "Deleted pages wait here for 30 days, then they are gone for good. Restore puts one back where it was.",
    empty: "The trash is empty",
    emptyHint: "A page you delete lands here first, so a mistake costs one click.",
    icon: Trash2,
  },
};
