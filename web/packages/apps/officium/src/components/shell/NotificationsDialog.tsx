"use client";

import { useState } from "react";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, Note } from "@javadaba/ui";

import { askForNotifications } from "../../lib/shell/pwa";
import { usePwa } from "./use-pwa";

/**
 * Notifications (Off-Shell, "Asking before the browser asks"): our sentence first, then the browser's prompt. A browser
 * that blocked them is told how to undo it; an iPhone is told to install first; one that allowed them says so.
 */
export function NotificationsDialog({ onClose }: { onClose: () => void }) {
  const { notifications } = usePwa();
  const [how, setHow] = useState(false);
  const asking = notifications === "default";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" data-testid="notifications-dialog">
        <DialogTitle>{asking ? "Let Officium notify you?" : "Notifications"}</DialogTitle>
        <DialogDescription className={asking ? undefined : "sr-only"}>
          {asking
            ? "Only when an agent needs you or a card you follow changes status. Your browser asks next."
            : "Whether this browser may notify you when an agent needs you."}
        </DialogDescription>
        {notifications === "denied" && (
          <Note tone="neutral">
            <span>
              <b>Notifications are blocked in this browser.</b> Allow them from the lock in the address bar, then come back.
              {how && <span className="mt-1 block">Open the lock, set Notifications to Allow, then reload this page.</span>}
            </span>
            <Button type="button" register="ui" variant="outline" size="sm" aria-expanded={how} onClick={() => setHow(true)}>
              How
            </Button>
          </Note>
        )}
        {notifications === "needs-install" && (
          <Note tone="info">
            <span>
              <b>On iPhone and iPad, install first.</b> Share, then Add to Home Screen; notifications work from the installed app.
            </span>
          </Note>
        )}
        {notifications === "granted" && (
          <Note tone="success">
            <span>
              <b>Notifications on for this browser.</b> Turn them off from the lock in the address bar.
            </span>
          </Note>
        )}
        {notifications === "unsupported" && (
          <Note tone="neutral">
            <span>
              <b>This browser can&apos;t show notifications.</b> Officium still shows what needs you on the board.
            </span>
          </Note>
        )}
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {asking ? (
            <>
              <DialogClose asChild>
                <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 sm:min-h-0">
                  Not now
                </Button>
              </DialogClose>
              <Button type="button" register="ui" size="sm" className="min-h-11 sm:min-h-0" onClick={() => void askForNotifications().then(onClose)}>
                Turn on notifications
              </Button>
            </>
          ) : (
            <DialogClose asChild>
              <Button type="button" register="ui" variant="outline" size="sm" className="min-h-11 sm:min-h-0">
                Close
              </Button>
            </DialogClose>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
