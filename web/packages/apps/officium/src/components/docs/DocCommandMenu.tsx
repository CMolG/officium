"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@javadaba/ui/navigation";
import { CommandMenu, CommandMenuEmpty, type CommandItem } from "@javadaba/ui";
import { FilePlus2, FileText, Folder, Keyboard } from "lucide-react";

import type { BacklogRepository } from "../../lib/backlog/repository";
import { docsPath } from "../../lib/backlog/search-links";
import type { DocPageSummary, DocTree } from "../../lib/backlog/types";
import { buildCommandGroups, type CommandEntry, type PageRef } from "../../lib/docs/command-items";
import { usePageCommandsReader } from "../../lib/docs/page-commands";
import { pagesOf } from "../../lib/docs/doc-tree";
import { useDocStars } from "../../lib/docs/use-doc-stars";
import { urlFor } from "../../lib/docs/use-doc-search";

const refOf = (page: DocPageSummary): PageRef => ({
  path: page.path,
  title: page.title,
  state: page.archivedAt ? "Archived" : page.published ? null : "Draft",
});

const ICONS: Record<CommandEntry["icon"], ReactNode> = {
  page: <FileText size={14} aria-hidden="true" />,
  section: <Folder size={14} aria-hidden="true" />,
  command: <Keyboard size={14} aria-hidden="true" />,
  create: <FilePlus2 size={14} aria-hidden="true" />,
};

export interface DocCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  repository: BacklogRepository;
  tree: DocTree | null;
  /** The page on screen, if any: its star and its actions are offered. */
  currentPath: string | null;
  canWrite: boolean;
  onNewPage: (title?: string) => void;
  onNewCollection: () => void;
  onShortcuts: () => void;
  onSidebar: () => void;
}

/**
 * The documentation's command menu (JAVA-799): find a page by its title or path, jump to a section, run the
 * open page's actions, or create. Empty, it shows what you starred and opened last. What is listed is decided by
 * `buildCommandGroups`; this component only loads the recent pages, draws the groups and runs the choice.
 */
export function DocCommandMenu(props: DocCommandMenuProps) {
  const { open, onOpenChange, projectId, repository, tree, currentPath, canWrite } = props;
  const router = useRouter();
  const { stars, isStarred, toggle } = useDocStars();
  const readPageCommands = usePageCommandsReader();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<PageRef[]>([]);

  // Read fresh every time it opens: the list is yours and changes as you read.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    repository.listRecentDocs(projectId, 5).then(
      (pages) => !cancelled && setRecent(pages.map(refOf)),
      () => !cancelled && setRecent([]),
    );
    return () => {
      cancelled = true;
    };
  }, [open, projectId, repository]);

  const pages = useMemo(() => [...pagesOf(tree?.collections ?? []), ...(tree?.pinned ?? [])].map(refOf), [tree]);
  const starred = useMemo<PageRef[]>(
    () => (stars ?? []).filter((star) => star.page).map((star) => ({ path: star.path, title: star.name, state: star.page?.archivedAt ? "Archived" : null })),
    [stars],
  );

  const pageCommands = open ? readPageCommands() : [];
  const starCommand: CommandEntry[] =
    currentPath && !currentPath.startsWith("officium") && pages.some((page) => page.path === currentPath)
      ? [
          {
            id: "run:star-page",
            label: isStarred(currentPath, "page") ? "Unstar this page" : "Star this page",
            icon: "command",
            action: { kind: "run", id: "star-page" },
          },
        ]
      : [];
  const pageEntries: CommandEntry[] = [
    ...pageCommands.map((def) => ({
      id: `run:page:${def.id}`,
      label: def.label,
      icon: "command" as const,
      disabledReason: def.disabledReason,
      action: { kind: "run" as const, id: `page:${def.id}` },
    })),
    ...starCommand,
  ];

  const groups = buildCommandGroups({
    query,
    pages,
    starred,
    recent,
    pageCommands: pageEntries,
    canWrite,
    canSeeTrash: canWrite,
  });

  function run(entry: CommandEntry) {
    const action = entry.action;
    if (action.kind === "open") router.push(docsPath(projectId, action.path));
    else if (action.kind === "search") router.push(urlFor(projectId, { q: action.query }));
    else if (action.kind === "create") props.onNewPage(action.title);
    else if (action.id === "new-page") props.onNewPage();
    else if (action.id === "new-collection") props.onNewCollection();
    else if (action.id === "shortcuts") props.onShortcuts();
    else if (action.id === "sidebar") props.onSidebar();
    else if (action.id === "star-page" && currentPath) void toggle(currentPath, "page");
    else if (action.id.startsWith("page:")) readPageCommands().find((def) => `page:${def.id}` === action.id)?.run();
  }

  /** A page command that puts the caret somewhere (Rename: the title) says where, for after the menu has closed. */
  function focusOnCloseOf(entry: CommandEntry) {
    const action = entry.action;
    return action.kind === "run" ? pageCommands.find((def) => `page:${def.id}` === action.id)?.focusOnClose : undefined;
  }

  const sections = groups.map((group) => ({
    id: group.id,
    heading: group.heading,
    items: group.entries.map<CommandItem>((entry) => ({
      id: entry.id,
      label: entry.label,
      hint: entry.hint,
      icon: ICONS[entry.icon],
      shortcut: entry.shortcut,
      disabledReason: entry.disabledReason,
      onSelect: () => run(entry),
      focusOnClose: focusOnCloseOf(entry),
    })),
  }));

  return (
    <CommandMenu
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
      sections={sections}
      query={query}
      onQueryChange={setQuery}
      title="Documentation command menu"
      placeholder="Search pages, or type a command"
      empty={<CommandMenuEmpty title={`Nothing matches “${query}”`} hint="Try fewer letters." />}
    />
  );
}
