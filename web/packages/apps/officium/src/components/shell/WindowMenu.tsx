"use client";

import { Link, usePathname } from "@javadaba/ui/navigation";
import { MenuItem, NavItem, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@javadaba/ui";
import { Ellipsis, Route, Settings2 } from "lucide-react";

import { CONFIGURATION_ROOT } from "../../lib/configuration/places";
import { useReplayBoardTour } from "../../lib/shell/board-tour";
import { useAppMenuRows } from "./use-app-menu-rows";

/**
 * The window's own menu (Off-Shell, "From the desktop window", JAVA-526): the project's settings, install as an app and
 * notifications, reachable without leaving the window. The window is the only chrome there, so what the product bar
 * and the sidebar offer on a page lives here.
 */
export function WindowMenu({ projectId }: { projectId: string | undefined }) {
  const { rows, dialogs } = useAppMenuRows();
  // The tour lights the board itself, so its replay is offered where the board is on screen (Off-Tour).
  const tour = useReplayBoardTour();
  const pathname = usePathname();
  const onBoard = projectId !== undefined && pathname === `/app/p/${projectId}`;
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <NavItem asChild className="min-h-9 px-2.5">
            <button type="button" aria-label="Officium menu" data-testid="window-menu">
              <Ellipsis size={16} aria-hidden="true" />
            </button>
          </NavItem>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-1.5">
          {projectId && (
            <PopoverClose asChild>
              <MenuItem as={Link} href={`${CONFIGURATION_ROOT}/p/${projectId}`}>
                <Settings2 size={16} aria-hidden="true" />
                <span>Project settings</span>
                <span className="ml-auto text-xs text-[color:var(--jd-muted)]">from this window</span>
              </MenuItem>
            </PopoverClose>
          )}
          {onBoard && (
            <PopoverClose asChild>
              <MenuItem onClick={tour.start}>
                <Route size={16} aria-hidden="true" />
                <span>Replay the tour</span>
              </MenuItem>
            </PopoverClose>
          )}
          {rows}
        </PopoverContent>
      </Popover>
      {dialogs}
    </>
  );
}
