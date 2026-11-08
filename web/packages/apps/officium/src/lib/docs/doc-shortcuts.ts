import type { ShortcutGroup } from "@javadaba/ui";

/**
 * Every key the documentation answers to (JAVA-799), written once: the shortcuts that are bound
 * (`useDocShortcuts`, the contents toggle) read their combos from here, and the sheet `?` opens lists the
 * same table, so the sheet cannot say a key that is not bound. The tree's and the editor's keys are
 * bound where those pieces live; they are here to be listed.
 */
export const DOC_SHORTCUTS = {
  menu: "Mod+K",
  sidebar: "Mod+.",
  help: "?",
  contents: "Ctrl+Alt+H",
} as const;

export const DOC_SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    heading: "Anywhere in the documentation",
    shortcuts: [
      { combo: DOC_SHORTCUTS.menu, label: "Open the command menu" },
      { combo: DOC_SHORTCUTS.sidebar, label: "Hide or show the sidebar" },
      { combo: DOC_SHORTCUTS.help, label: "Show these shortcuts" },
      { combo: DOC_SHORTCUTS.contents, label: "Show or hide the page contents" },
    ],
  },
  {
    heading: "In the page tree",
    shortcuts: [
      { combo: "ArrowDown", label: "Next page" },
      { combo: "ArrowUp", label: "Previous page" },
      { combo: "ArrowRight", label: "Open a collection" },
      { combo: "ArrowLeft", label: "Close a collection" },
      { combo: "Alt+ArrowUp", label: "Move a page up among its siblings" },
      { combo: "Alt+ArrowDown", label: "Move a page down among its siblings" },
    ],
  },
  {
    heading: "While editing a page",
    shortcuts: [
      { combo: "Mod+S", label: "Save" },
      { combo: "Mod+Enter", label: "Save" },
      { combo: "Alt+F10", label: "Go to the formatting toolbar" },
    ],
  },
];
