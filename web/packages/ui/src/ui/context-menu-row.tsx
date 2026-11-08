import * as React from "react";

// A row (Lib-Feedback `.mi`): 36 px under a mouse, 44 px under a finger (layout floor L3), radius 8,
// the stone wash on hover. `data-highlighted` is Radix's pointer-hover AND keyboard focus, so one
// style covers both; the ink ring (inset, so the sheet never clips it) shows for the keyboard only.
export const rowClass =
  "flex min-h-9 w-full cursor-default select-none flex-row items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm text-[color:var(--jd-ink)] outline-none transition-colors pointer-coarse:min-h-11 " +
  "data-[highlighted]:bg-[color:var(--jd-card)] data-[disabled]:cursor-not-allowed data-[disabled]:text-[color:var(--jd-ink)]/50 " +
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--jd-focus)]";

export const DANGER = "text-[color:var(--jd-danger)]";

/** The sheet of every menu and submenu: 14 px radius, 6 px padding, the overlay's ring and long shadow. */
export const MENU_SHEET =
  "flex max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[17.5rem] max-w-[min(20rem,calc(100vw-1rem))] flex-col overflow-y-auto rounded-[14px] p-1.5 shadow-[var(--jd-shadow-overlay)]";

/** Icons share a 16 px column, so labels line up whether a row has one or not. */
export function ItemIcon({ icon }: { icon?: React.ReactNode }) {
  return (
    <span aria-hidden className="flex size-4 shrink-0 flex-row items-center justify-center [&>svg]:size-4">
      {icon}
    </span>
  );
}
