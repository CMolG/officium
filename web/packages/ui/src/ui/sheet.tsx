"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "../lib/cn";
import { usePortalContainer } from "../lib/portal-container";
import { focusIsWithin, useOpenerStamp } from "../lib/opener-stamp";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from "./dialog";
import { ToastDock } from "./toast-dock";

/**
 * The bottom sheet (Acct-Frames `.sheetbtm`): a layer that rises from the bottom edge with a 28 px top radius,
 * a grab handle and a long upward shadow. From `sm` up it becomes the aside on the right edge, so one piece
 * answers "a panel over the app" at every width; `side` pins one of the two when a caller wants only one.
 *
 * `side="left"` is the same aside on the left edge (Gymnasium opens its menu from there, wave 7, MIG-A51): the
 * same Dialog underneath, so focus, the scrim, Back and Escape, and the same fade, only the edge changes.
 *
 * It is a `Dialog` underneath (Back closes it on a phone, Escape everywhere, focus is trapped and returned),
 * and like `DialogContent` it wears the surface of the element that had focus when it opened, so the
 * raised white and the scrim tokens exist in the portal.
 */
export type SheetSide = "auto" | "bottom" | "right" | "left";

const Sheet = Dialog;
const SheetTrigger = DialogTrigger;
const SheetClose = DialogClose;
const SheetTitle = DialogTitle;
const SheetDescription = DialogDescription;

const BOTTOM =
  "inset-x-0 bottom-0 max-h-[92%] rounded-t-[28px] px-4 pb-7 pt-3 shadow-[0_-24px_70px_rgba(17,17,17,0.16)] data-[state=open]:animate-jd-sheet-in data-[state=closed]:animate-jd-sheet-out";
const RIGHT =
  "inset-y-0 right-0 w-[min(420px,100%)] rounded-l-[var(--radius-jd-xl)] p-6 shadow-[var(--jd-shadow-overlay)] data-[state=open]:animate-jd-fade-in data-[state=closed]:animate-jd-fade-out";
const LEFT =
  "inset-y-0 left-0 w-[min(420px,100%)] rounded-r-[var(--radius-jd-xl)] p-6 shadow-[var(--jd-shadow-overlay)] data-[state=open]:animate-jd-fade-in data-[state=closed]:animate-jd-fade-out";
const AUTO_RIGHT =
  "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:w-[min(420px,100%)] sm:rounded-t-none sm:rounded-l-[var(--radius-jd-xl)] sm:p-6 sm:shadow-[var(--jd-shadow-overlay)] sm:data-[state=open]:animate-jd-fade-in sm:data-[state=closed]:animate-jd-fade-out";

export interface SheetContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: SheetSide;
  /** The label of the handle's neighbour, never needed: the handle is decoration. */
  hideHandle?: boolean;
}

const SheetContent = React.forwardRef<React.ElementRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side = "auto", hideHandle = false, className, children, onOpenAutoFocus, ...props }, ref) => {
    const container = usePortalContainer();
    const stamp = useOpenerStamp();
    const placement = side === "right" ? RIGHT : side === "left" ? LEFT : side === "bottom" ? BOTTOM : cn(BOTTOM, AUTO_RIGHT);
    const handle = side === "auto" ? "sm:hidden" : side === "right" || side === "left" ? "hidden" : "";
    return (
      <DialogPortal container={container ?? undefined}>
        <DialogOverlay data-jd-surface={stamp.kind} className={stamp.className} />
        <DialogPrimitive.Content
          ref={ref}
          data-jd-surface={stamp.kind}
          data-jd-layer=""
          data-jd-component="Sheet"
          className={cn(
            stamp.className,
            "fixed z-[100] flex flex-col gap-3.5 overflow-y-auto overflow-x-hidden overscroll-contain bg-[color:var(--jd-raised)] text-[color:var(--jd-ink)] *:min-w-0 [&:not(.overflow-hidden)>*]:shrink-0",
            placement,
            className,
          )}
          onOpenAutoFocus={(event) => {
            if (container && !focusIsWithin(container)) event.preventDefault();
            onOpenAutoFocus?.(event);
          }}
          {...props}
        >
          {hideHandle ? null : (
            <span aria-hidden="true" className={cn("mx-auto h-1 w-10 shrink-0 rounded-sm bg-[color:var(--jd-ink)]/20", handle)} />
          )}
          {children}
          <ToastDock />
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  },
);
SheetContent.displayName = "SheetContent";

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription };
