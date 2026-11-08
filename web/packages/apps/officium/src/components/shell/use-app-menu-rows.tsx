"use client";

import { useState, type ReactNode } from "react";
import { Bell, Download } from "lucide-react";

import { MenuItem, PopoverClose } from "@javadaba/ui";

import { InstallAppDialog } from "./InstallAppDialog";
import { NotificationsDialog } from "./NotificationsDialog";
import { usePwa } from "./use-pwa";

const STATE_WORD = { default: "Off", denied: "Blocked", granted: "On", "needs-install": "Install first", unsupported: "Not available" } as const;

/**
 * The two rows Officium adds to its menus (Off-Shell, "From the desktop window"): Install as an app, while the browser
 * offers it, and Notifications with where they stand. Their dialogs live beside the menu, not inside it, because a
 * menu that closes would take its dialog with it. Returns the rows and the dialogs for the caller to place; `any` is
 * whether there is a row at all, so a menu with nothing else can stay away.
 */
export function useAppMenuRows(): { rows: ReactNode; dialogs: ReactNode; any: boolean } {
  const pwa = usePwa();
  const [open, setOpen] = useState<"install" | "notifications" | null>(null);
  const install = pwa.canInstall && !pwa.installed;
  const notify = pwa.notifications !== "unsupported";
  const rows = (
    <>
      {install && (
        <PopoverClose asChild>
          <MenuItem onClick={() => setOpen("install")} data-testid="menu-install-app">
            <Download size={16} aria-hidden="true" />
            <span>Install Officium as an app</span>
          </MenuItem>
        </PopoverClose>
      )}
      {notify && (
        <PopoverClose asChild>
          <MenuItem onClick={() => setOpen("notifications")} data-testid="menu-notifications">
            <Bell size={16} aria-hidden="true" />
            <span>Notifications</span>
            <span className="ml-auto text-xs text-[color:var(--jd-muted)]">{STATE_WORD[pwa.notifications]}</span>
          </MenuItem>
        </PopoverClose>
      )}
    </>
  );
  const dialogs = (
    <>
      {open === "install" && <InstallAppDialog onClose={() => setOpen(null)} />}
      {open === "notifications" && <NotificationsDialog onClose={() => setOpen(null)} />}
    </>
  );
  return { rows, dialogs, any: install || notify };
}
