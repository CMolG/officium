import { fuzzyScore } from "@javadaba/ui/shortcuts";

import { ARCHIVE_PATH, CHANGELOG_PATH, RECENT_PATH, TEST_HISTORY_PATH, TRASH_PATH, UNPUBLISHED_PATH } from "./doc-path";

/**
 * What the documentation's command menu lists, and in what order (JAVA-799). Pure: the menu component
 * draws these and runs their `action`; nothing here touches the DOM, the router or the API.
 */
export interface PageRef {
  path: string;
  title: string;
  /** In words: an archived page or an unpublished draft says so. */
  state?: "Archived" | "Draft" | null;
}

export type CommandAction =
  | { kind: "open"; path: string }
  | { kind: "run"; id: string }
  | { kind: "search"; query: string }
  | { kind: "create"; title: string };

export interface CommandEntry {
  id: string;
  label: string;
  hint?: string;
  icon: "page" | "section" | "command" | "create";
  shortcut?: string;
  /** Why it can't run right now; it stays listed so the reason can be read. */
  disabledReason?: string;
  action: CommandAction;
}

export interface CommandGroup {
  id: string;
  heading: string;
  entries: CommandEntry[];
}

export interface CommandContext {
  query: string;
  /** Every page that can be opened: the project's own and Officium's, in tree order. */
  pages: PageRef[];
  starred: PageRef[];
  /** Newest first. */
  recent: PageRef[];
  /** What the open page offers (edit, rename, star, ...), with the reason when one is blocked. */
  pageCommands: CommandEntry[];
  canWrite: boolean;
  /** Whether the Trash section exists for this person (editors only). */
  canSeeTrash: boolean;
}

const RECENT_SHOWN = 5;
const PAGES_SHOWN = 8;

const pageEntry = (page: PageRef, prefix: string): CommandEntry => ({
  id: `${prefix}:${page.path}`,
  label: page.title,
  hint: page.state ? `${page.path} · ${page.state}` : page.path,
  icon: "page",
  action: { kind: "open", path: page.path },
});

const sectionEntry = (path: string, label: string): CommandEntry => ({
  id: `section:${path}`,
  label,
  icon: "section",
  action: { kind: "open", path },
});

const searchEntry = (label: string, query: string): CommandEntry => ({
  id: "search:text",
  label,
  icon: "section",
  action: { kind: "search", query },
});

function sections(canSeeTrash: boolean): CommandEntry[] {
  return [
    sectionEntry(CHANGELOG_PATH, "Changelog"),
    sectionEntry(TEST_HISTORY_PATH, "Test history"),
    sectionEntry(RECENT_PATH, "Recent"),
    sectionEntry(UNPUBLISHED_PATH, "Unpublished drafts"),
    sectionEntry(ARCHIVE_PATH, "Archive"),
    ...(canSeeTrash ? [sectionEntry(TRASH_PATH, "Trash")] : []),
  ];
}

function createCommands(canWrite: boolean): CommandEntry[] {
  const reason = canWrite ? undefined : "Viewers can't create pages.";
  return [
    { id: "run:new-page", label: "New page", icon: "create", disabledReason: reason, action: { kind: "run", id: "new-page" } },
    { id: "run:new-collection", label: "New collection", icon: "create", disabledReason: reason, action: { kind: "run", id: "new-collection" } },
  ];
}

const helpCommands = (): CommandEntry[] => [
  { id: "run:shortcuts", label: "Keyboard shortcuts", icon: "command", shortcut: "?", action: { kind: "run", id: "shortcuts" } },
  { id: "run:sidebar", label: "Show or hide the sidebar", icon: "command", shortcut: "Mod+.", action: { kind: "run", id: "sidebar" } },
];

/** A page's score for a query: its title counts in full, its path a little less, and no match is -1. */
export function pageScore(query: string, page: PageRef): number {
  const byTitle = fuzzyScore(query, page.title);
  const byPath = fuzzyScore(query, page.path);
  return Math.max(byTitle, byPath < 0 ? -1 : byPath * 0.8);
}

function ranked<T>(items: T[], score: (item: T) => number, limit: number): T[] {
  return items
    .map((item, order) => ({ item, score: score(item), order }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map((row) => row.item);
}

/** The menu's groups for what has been typed. Empty groups are left out. */
export function buildCommandGroups(context: CommandContext): CommandGroup[] {
  const query = context.query.trim();
  const groups: CommandGroup[] = [];
  const add = (id: string, heading: string, entries: CommandEntry[]) => entries.length > 0 && groups.push({ id, heading, entries });
  const commands = [...context.pageCommands, ...createCommands(context.canWrite), ...helpCommands()];

  if (query === "") {
    add("starred", "Starred", context.starred.slice(0, RECENT_SHOWN).map((page) => pageEntry(page, "starred")));
    add("recent", "Recent", context.recent.slice(0, RECENT_SHOWN).map((page) => pageEntry(page, "recent")));
    add("go", "Go to", sections(context.canSeeTrash));
    add("page", "This page", context.pageCommands);
    add("create", "Create", createCommands(context.canWrite));
    add("help", "Help", helpCommands());
    add("search", "Search", [searchEntry("Search the text of every page", "")]);
    return groups;
  }

  add("pages", "Pages", ranked(context.pages, (page) => pageScore(query, page), PAGES_SHOWN).map((page) => pageEntry(page, "page")));
  const matching = ranked([...commands, ...sections(context.canSeeTrash)], (entry) => fuzzyScore(query, entry.label), PAGES_SHOWN);
  add("commands", "Commands", matching);
  if (groups.length === 0 && context.canWrite) {
    add("create-titled", "Create", [
      { id: "create-titled", label: `Create a page titled “${query}”`, icon: "create", action: { kind: "create", title: query } },
    ]);
  }
  add("search", "Search", [searchEntry(`Search page text for “${query}”`, query)]);
  return groups;
}
