"use client";

import { ListTree } from "lucide-react";

import { Button, Text } from "@javadaba/ui";

/**
 * The documentation view's top row (Doc-Page): the title, and once there are pages the phone's "Pages" button and the
 * toolbar. The way back to the board and the project's switcher are not repeated here: the workspace sidebar and the
 * desktop window's own navigation already carry them (Off-Shell).
 */
export function DocsHeader({
  showControls,
  drawerOpen,
  onOpenDrawer,
  toolbar,
}: {
  showControls: boolean;
  drawerOpen: boolean;
  onOpenDrawer: () => void;
  toolbar: React.ReactNode;
}) {
  return (
    <div className="flex flex-row flex-wrap items-center gap-3">
      <Text as="h1" type="h2" className="min-w-0 flex-1">
        Documentation
      </Text>
      {showControls && (
        <div className="flex flex-row items-center gap-2">
          <Button type="button" register="ui" size="sm" variant="outline" className="md:hidden" aria-expanded={drawerOpen} onClick={onOpenDrawer}>
            <ListTree size={14} aria-hidden="true" /> Pages
          </Button>
          <span className="hidden flex-row md:inline-flex">{toolbar}</span>
        </div>
      )}
    </div>
  );
}
