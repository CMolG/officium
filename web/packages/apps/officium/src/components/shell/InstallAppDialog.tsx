"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, ProductSeal } from "@javadaba/ui";

import { promptInstall } from "../../lib/shell/pwa";

/**
 * "Install Officium as an app" (Off-Shell, JAVA-1674): our sentence first, then the browser's own question. Offered from
 * the menus, never on its own and never in the way.
 */
export function InstallAppDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-testid="install-app-dialog">
        <div className="flex flex-row items-center gap-3">
          <ProductSeal brand="officium" size={44} />
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle>Install Officium as an app</DialogTitle>
            <DialogDescription>Its own window, in the dock, and notifications when an agent needs you.</DialogDescription>
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 sm:min-h-0">
              Not now
            </Button>
          </DialogClose>
          <Button
            type="button"
            register="ui"
            size="sm"
            className="min-h-11 sm:min-h-0"
            onClick={() => {
              void promptInstall().finally(onClose);
            }}
          >
            Install
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
