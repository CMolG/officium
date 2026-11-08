import type { KeyboardEvent } from "react";

import type { ViewId } from "./sidebar-views";

/** Where the person is in the workspace, as the tree needs to know it. */
export interface Place {
  pathname: string;
  /** The project in view, if any, and which of its views. */
  projectId: string | undefined;
  view: ViewId | null;
  /** The folder the projects home is showing (`/app?folder=`); `null` is All Projects. */
  homeFolderId: string | null | undefined;
  rail: boolean;
  onNavigate: () => void;
}

/** ArrowRight opens a node and ArrowLeft closes it, from any control on its row. */
export function disclosureKeys(expanded: boolean, setExpanded: (open: boolean) => void) {
  return (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" && !expanded) {
      e.preventDefault();
      setExpanded(true);
    } else if (e.key === "ArrowLeft" && expanded) {
      e.preventDefault();
      setExpanded(false);
    }
  };
}
