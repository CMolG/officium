import type { SidebarFrameKeys } from "../shell/SidebarFrame";

/** Where the documentation sidebar remembers its fold, per viewer; the shortcut (Mod+.) flips the same key (JAVA-799). */
export const DOCS_SIDEBAR_KEY = "officium:docs:sidebar-collapsed:v1";

/** The documentation frame: its region, its keys and the test ids its specs read (JAVA-1626 lifted the frame). */
export const DOCS_SIDEBAR_FRAME: SidebarFrameKeys = {
  label: "Pages",
  foldKey: DOCS_SIDEBAR_KEY,
  widthKey: "officium:docs:sidebar-width:v1",
  testIds: { frame: "doc-sidebar", tree: "doc-tree", splitter: "doc-sidebar-splitter" },
};
