"use client";

import type { Editor } from "@tiptap/react";
import { FilePlus2, FileText, User } from "lucide-react";
import { useState } from "react";

import { applyBlockItem, canApply, filterBlockItems, type BlockItem } from "./block-items";
import { hasExactTitle, insertLink, type LinkSources, type LinkTarget } from "./links";
import { SuggestionMenu, type MenuOption } from "./SuggestionMenu";
import type { OpenSuggestion, SuggestionStore } from "./suggestions";

type Creating = { title: string; failed: string | null } | null;

/**
 * What an open trigger lists (JAVA-796): the blocks for `/`; pages for `[[`; members, then pages,
 * for `@`. When no title matches what was typed exactly, the last option creates that page and
 * links it; a failure keeps the query and says why.
 */
export function PageMenu({ editor, store, open, blockItems, linkSources }: {
  editor: Editor;
  store: SuggestionStore;
  open: OpenSuggestion;
  blockItems: readonly BlockItem[];
  linkSources?: LinkSources;
}) {
  const [creating, setCreating] = useState<Creating>(null);
  const { kind, query, range, rect } = open;

  if (kind === "block") {
    const options: MenuOption[] = filterBlockItems(blockItems, query)
      .filter((item) => canApply(editor, item))
      .map((item) => ({ id: item.id, label: item.label, detail: item.description, icon: item.icon, choose: () => applyBlockItem(editor, item, range) }));
    return (
      <SuggestionMenu
        editor={editor}
        store={store}
        query={query}
        rect={rect}
        options={options}
        label="Blocks"
        heading={query.trim() ? `Blocks matching “${query.trim()}”` : "Blocks"}
        message={options.length ? undefined : `No block matches “${query}”`}
      />
    );
  }

  const choose = (target: LinkTarget) => insertLink(editor, store.get()?.range ?? range, target);
  const members = kind === "mention" ? linkSources?.members?.(query) ?? [] : [];
  const pages = linkSources?.pages(query) ?? [];
  const title = query.trim();
  const create = async () => {
    if (!linkSources?.createPage) return;
    setCreating({ title, failed: null });
    try {
      choose(await linkSources.createPage(title));
      setCreating(null);
    } catch (error) {
      setCreating({ title, failed: error instanceof Error ? error.message : String(error) });
    }
  };

  const options: MenuOption[] = [
    ...(members ?? []).map((m) => ({ id: m.href, label: m.title, detail: m.detail ?? "Member", icon: User, choose: () => choose(m) })),
    ...pages.map((p) => ({ id: p.href, label: p.title, detail: p.detail, icon: FileText, choose: () => choose(p) })),
  ];
  if (title && linkSources?.createPage && !hasExactTitle(pages, title)) {
    options.push({ id: "create", label: `Create page “${title}”`, icon: FilePlus2, choose: () => void create() });
  }

  const pending = creating && creating.title === title ? creating : null;
  const message = pending?.failed
    ? `Couldn't create “${pending.title}”: ${pending.failed}`
    : pending
      ? `Creating “${pending.title}”…`
      : members === null
        ? "Loading members…"
        : options.length
          ? undefined
          : `No page matches “${query}”`;

  return (
    <SuggestionMenu
      editor={editor}
      store={store}
      query={query}
      rect={rect}
      options={options}
      label={kind === "mention" ? "Members and pages" : "Pages"}
      message={message}
      alert={Boolean(pending?.failed)}
    />
  );
}
