"use client";

import { Button } from "@javadaba/ui";
import { FilePlus2, FolderPlus } from "lucide-react";

/** New collection and New page, for those who can write (Doc-Page): in the header from md up and in the phone's drawer. */
export function DocsToolbar({ onNewPage, onNewCollection }: { onNewPage: () => void; onNewCollection: () => void }) {
  return (
    <div className="flex flex-row flex-wrap items-center gap-2">
      <Button type="button" register="ui" size="sm" variant="outline" onClick={onNewCollection}>
        <FolderPlus size={14} aria-hidden="true" /> New collection
      </Button>
      <Button type="button" register="ui" size="sm" onClick={onNewPage}>
        <FilePlus2 size={14} aria-hidden="true" /> New page
      </Button>
    </div>
  );
}
