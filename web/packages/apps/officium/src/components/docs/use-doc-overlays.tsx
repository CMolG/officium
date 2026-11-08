"use client";

import { useState, type ReactNode } from "react";
import { ShortcutsSheet, useSidebarCollapsed } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { DocTree } from "../../lib/backlog/types";
import { DOC_SHORTCUT_GROUPS } from "../../lib/docs/doc-shortcuts";
import { DocCommandMenu } from "./DocCommandMenu";
import { DOCS_SIDEBAR_KEY } from "./docs-sidebar-keys";
import { useDocShortcuts } from "./use-doc-shortcuts";

/**
 * The documentation's two overlays and the keys that open them (JAVA-799): the command menu (Mod+K, or the
 * sidebar's search button) and the shortcuts sheet (`?`, or the menu). Mod+. folds the sidebar. Returns the
 * element to render and the function the search button calls.
 */
export function useDocOverlays(options: {
  projectId: string;
  repository: BacklogRepository;
  tree: DocTree | null;
  currentPath: string | null;
  canWrite: boolean;
  onNewPage: (title?: string) => void;
  onNewCollection: () => void;
}): { openMenu: () => void; element: ReactNode } {
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const { toggle: toggleSidebar } = useSidebarCollapsed(DOCS_SIDEBAR_KEY);
  useDocShortcuts({ onMenu: () => setMenuOpen((open) => !open), onSidebar: toggleSidebar, onHelp: () => setHelpOpen(true) });
  return {
    openMenu: () => setMenuOpen(true),
    element: (
      <>
        <DocCommandMenu {...options} open={menuOpen} onOpenChange={setMenuOpen} onShortcuts={() => setHelpOpen(true)} onSidebar={toggleSidebar} />
        <ShortcutsSheet open={helpOpen} onOpenChange={setHelpOpen} groups={DOC_SHORTCUT_GROUPS} />
      </>
    ),
  };
}
