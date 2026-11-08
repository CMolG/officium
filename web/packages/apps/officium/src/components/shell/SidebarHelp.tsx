"use client";

import { CircleHelp, Route } from "lucide-react";
import { MenuItem, NavItem, Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@javadaba/ui";

import { useReplayBoardTour } from "../../lib/shell/board-tour";
import { useAppMenuRows } from "./use-app-menu-rows";

/**
 * Help, at the foot of the workspace sidebar (Off-Tour: "Help in the sidebar · Replay the tour"). The tour opens by
 * itself once; this is the way back to it whenever a board is on screen, because its steps light parts of the board.
 * Elsewhere there is nothing to replay over, so that row is not offered rather than offered and centered on nothing.
 * The app's own rows (install, notifications; Off-Shell) are here on every page, so the menu exists wherever there is
 * one of them.
 */
export function SidebarHelp({ onBoard, rail }: { onBoard: boolean; rail: boolean }) {
  const tour = useReplayBoardTour();
  const { rows, dialogs, any } = useAppMenuRows();
  if (!onBoard && !any) return null;
  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <NavItem asChild folded={rail}>
            <button type="button" aria-label="Help" title={rail ? "Help" : undefined} className="w-full gap-2 px-2">
              <CircleHelp size={15} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-left">Help</span>
            </button>
          </NavItem>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-60 p-1.5">
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
