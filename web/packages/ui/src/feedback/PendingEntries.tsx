"use client";

import * as React from "react";

import { ContextMenuItem, ContextMenuLabel } from "../ui/context-menu";
import { Spinner } from "../ui/spinner";
import { MenuEntries } from "./MenuEntries";
import type { MenuContext, MenuEntry, PendingEntry } from "./menu-model";

type Loaded = { state: "loading" } | { state: "failed" } | { state: "done"; entries: MenuEntry[] };

/**
 * Rows that arrive after the menu opened (Lib-Overlays § ContextMenu: loading, empty, failed). A load that
 * resolves after the menu closed is dropped. A failed load keeps its row and a way to try again.
 */
export function PendingEntries({ entry, ctx }: { entry: PendingEntry; ctx: MenuContext }) {
  const [loaded, setLoaded] = React.useState<Loaded>({ state: "loading" });
  const [attempt, setAttempt] = React.useState(0);
  const load = React.useRef(entry.load);
  React.useEffect(() => {
    let live = true;
    load.current().then(
      (entries) => live && setLoaded({ state: "done", entries }),
      () => live && setLoaded({ state: "failed" }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (loaded.state === "loading") {
    return (
      <ContextMenuLabel role="status" className="gap-2 text-xs font-normal normal-case tracking-normal">
        <Spinner size={14} />
        {entry.labels.loading}
      </ContextMenuLabel>
    );
  }
  if (loaded.state === "failed") {
    return (
      <ContextMenuItem
        onSelect={(event) => {
          // Stays open: the person asked for another try, not to leave.
          event.preventDefault();
          setLoaded({ state: "loading" });
          setAttempt(attempt + 1);
        }}
      >
        {entry.labels.failed}
      </ContextMenuItem>
    );
  }
  if (loaded.entries.length === 0) return <ContextMenuLabel className="text-xs font-normal normal-case tracking-normal">{entry.labels.empty}</ContextMenuLabel>;
  return <MenuEntries entries={loaded.entries} ctx={ctx} />;
}
