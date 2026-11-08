"use client";

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";

import type { DocPage } from "../backlog/types";

/**
 * What the open page offers the command menu (JAVA-799): the same handlers its own buttons call, each with
 * the reason when it is blocked. The page registers a getter, not a list, so the menu reads the page as it is
 * when it opens and nothing re-renders to keep a list in step.
 */
export interface PageCommandDef {
  id: string;
  label: string;
  /** Why it can't run now (read only, archived, a draft...); the command stays listed so this can be read. */
  disabledReason?: string;
  run: () => void;
  /** Where the caret goes once the menu has closed (Rename: the title). */
  focusOnClose?: () => HTMLElement | null;
}

interface PageCommandsApi {
  register: (getter: () => PageCommandDef[]) => () => void;
  read: () => PageCommandDef[];
}

const PageCommandsContext = createContext<PageCommandsApi | null>(null);

export function PageCommandsProvider({ children }: { children: ReactNode }) {
  const getter = useRef<() => PageCommandDef[]>(() => []);
  const api = useMemo<PageCommandsApi>(
    () => ({
      register: (next) => {
        getter.current = next;
        return () => {
          getter.current = () => [];
        };
      },
      read: () => getter.current(),
    }),
    [],
  );
  return <PageCommandsContext.Provider value={api}>{children}</PageCommandsContext.Provider>;
}

/** The commands of the page on screen, or none. Called by the menu when it renders. */
export function usePageCommandsReader(): () => PageCommandDef[] {
  return useContext(PageCommandsContext)?.read ?? (() => []);
}

/** Registers the open page's commands for as long as it is mounted. */
export function usePageCommands(defs: PageCommandDef[]): void {
  const api = useContext(PageCommandsContext);
  const latest = useRef(defs);
  useEffect(() => {
    latest.current = defs;
  });
  useEffect(() => api?.register(() => latest.current), [api]);
}

/** Rename (which puts the caret in the title, JAVA-1537), Archive and Delete as the page's buttons rule them (`DocPageActions`). */
export function pageCommandDefs({
  page,
  canWrite,
  busy,
  titleField,
  onArchive,
  onDelete,
}: {
  page: DocPage;
  canWrite: boolean;
  busy: boolean;
  /** The page's title field, which is its rename (JAVA-1537). */
  titleField: () => HTMLElement | null;
  onArchive: () => void;
  onDelete: () => void;
}): PageCommandDef[] {
  const blocked = page.builtin
    ? "Officium's own pages can't be changed."
    : !canWrite
      ? "Viewers can't change pages."
      : busy
        ? "Another change to this page is still running."
        : undefined;
  const archived = page.archivedAt !== null;
  // A template stays at its path and is never archived (JAVA-801): a new one goes where it is wanted.
  const template = page.template ? "A template can't be moved or archived: make a new one, or delete it." : undefined;
  const whileArchived = blocked ?? (archived ? "Unarchive this page first." : template);
  const archive = blocked ?? template ?? (archived ? "This page is already archived." : page.publishedAt === null ? "Publish this draft first, or delete it." : undefined);
  return [
    { id: "rename", label: "Rename this page", disabledReason: whileArchived, run: () => {}, focusOnClose: titleField },
    { id: "archive", label: "Archive this page", disabledReason: archive, run: onArchive },
    { id: "delete", label: "Move this page to the trash", disabledReason: blocked, run: onDelete },
  ];
}
