"use client";

import { Bot, UserRound } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@javadaba/ui";

import type { Card } from "../../lib/backlog/types";
import { formatDate } from "../../lib/backlog/format";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";

export interface ConflictInfo {
  message: string;
  /** The server's current card -- what actually got saved. Typed as the `Card` subset shared by
   *  every write's conflict payload (some carry the fuller `CardDetail`; this dialog only shows
   *  fields both have). */
  current: Card;
  /** Re-issues the SAME write, now targeting `current.version`. */
  onKeepMine: () => void | Promise<void>;
}

/**
 * JDB-226: "on 409 show the incoming version and let the person keep theirs (retry with the new
 * `expectedVersion`) or take the other -- never overwrite silently." `Board`'s `refresh()` (or
 * `TaskModal`'s `onChanged`) already re-pulled the server's real state by the time this opens --
 * losing the write is not a risk, staying SILENT about it is what this closes. "Use theirs" is
 * therefore just acknowledging what is already on screen; "Keep mine" re-attempts the local edit.
 */
export function ConflictDialog({ info, onClose }: { info: ConflictInfo; onClose: () => void }) {
  const returnFocus = useReturnFocus();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-md">
        <DialogTitle>Someone else changed this card first</DialogTitle>
        <DialogDescription>{info.message}</DialogDescription>

        <div className="rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3">
          <p className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Current on the server</p>
          <p className="mt-1 text-sm font-semibold">
            {info.current.key}: {info.current.title}
          </p>
          <p className="mt-1 flex flex-row items-center gap-1 text-xs text-[color:var(--jd-muted)]">
            {info.current.updatedBy.kind === "agent" ? <Bot size={11} aria-hidden="true" /> : <UserRound size={11} aria-hidden="true" />}
            Updated {formatDate(info.current.updatedAt.slice(0, 10))} by{" "}
            {info.current.updatedBy.kind === "agent" ? info.current.updatedBy.agentName : info.current.updatedBy.name}
          </p>
        </div>

        <p className="text-sm text-[color:var(--jd-muted)]">
          The board already shows their version. Keep working on top of it, or try your change
          again against it.
        </p>

        <DialogFooter className="border-t border-[color:var(--jd-line)] pt-4">
          <Button type="button" register="ui" variant="outline" onClick={onClose}>
            Use their version
          </Button>
          <Button
            type="button"
            register="ui"
            onClick={() => {
              void info.onKeepMine();
              onClose();
            }}
          >
            Try my change again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
