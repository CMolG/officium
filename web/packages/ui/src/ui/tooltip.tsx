"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../lib/cn";
import { usePortalContainer } from "../lib/portal-container";
import { DEFAULT_STAMP, surfaceOf, type SurfaceStamp } from "../lib/surface-stamp";
import { useShortcutLabel } from "./use-shortcut-label";

/*
 * Tooltip (Lib-Pieces § Alert · Tooltip): names an icon-only control or finishes a truncated line. It holds
 * nothing a person needs to complete a task, so nothing is reachable only through it.
 *
 * - Hover shows it after 500 ms; keyboard focus shows it at once; a long press shows it on touch; Esc hides it.
 * - An ink pill, 12 px, no arrow, above the control; it flips and shifts when clipped, and it portals to
 *   <body> so a scrolling box never cuts it.
 *
 * Built on the Popover primitive the package already depends on (placement, collision, portal, outside-press),
 * held open by hand instead of by a trigger, because a tooltip must not take focus nor announce itself as a
 * dialog. The name stays on the control (`aria-label`); this is the visual twin of it.
 */

/** How long the pointer must rest on the control before the tooltip shows. */
export const TOOLTIP_DELAY_MS = 500;

export interface TooltipProps {
  /** What the tooltip says: the control's name, or the full text of a cut line. */
  label: React.ReactNode;
  /** The shortcut that does the same, shown after the label (`Mod+L` draws "⌘L" on a Mac). */
  shortcut?: string;
  /** Show only when the child's text is cut (a truncated line); otherwise it is never needed. */
  whenTruncated?: boolean;
  side?: "top" | "bottom";
  /** The one element it describes. It receives the handlers; give a focusable one, or a line with `tabIndex={0}`. */
  children: React.ReactElement;
}

export function Tooltip({ label, shortcut, whenTruncated = false, side = "top", children }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const [stamp, setStamp] = React.useState<SurfaceStamp>(DEFAULT_STAMP);
  const container = usePortalContainer();
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shortcutText = useShortcutLabel(shortcut);

  const clear = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };
  React.useEffect(() => clear, []);

  const show = (node: HTMLElement) => {
    if (whenTruncated && node.scrollWidth <= node.clientWidth) return;
    setStamp(surfaceOf(node));
    setOpen(true);
  };
  const later = (node: HTMLElement) => {
    clear();
    timer.current = setTimeout(() => show(node), TOOLTIP_DELAY_MS);
  };
  const hide = () => {
    clear();
    setOpen(false);
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={(next) => !next && hide()}>
      <PopoverPrimitive.Anchor asChild>
        <Slot
          onPointerEnter={(event: React.PointerEvent<HTMLElement>) => event.pointerType !== "touch" && later(event.currentTarget)}
          onPointerLeave={hide}
          onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
            // A press on a mouse is the person acting, not asking: the tip gets out of the way. A held finger asks.
            if (event.pointerType === "touch") later(event.currentTarget);
            else hide();
          }}
          onPointerUp={clear}
          onPointerCancel={hide}
          onFocus={(event: React.FocusEvent<HTMLElement>) => {
            // Keyboard focus only: a click focuses too, and must not summon the tip it just dismissed.
            if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget);
          }}
          onBlur={hide}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (event.key !== "Escape" || !open) return;
            // Esc hides the tip only; the dialog or menu around it stays.
            event.stopPropagation();
            hide();
          }}
        >
          {children}
        </Slot>
      </PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal container={container ?? undefined}>
        <PopoverPrimitive.Content
          role="tooltip"
          side={side}
          sideOffset={8}
          collisionPadding={8}
          data-jd-surface={stamp.kind}
          // A layer above a modal Dialog (see dialog.tsx, FLOATING_LAYER_ATTR): presses on it are not "outside".
          data-jd-floating-layer=""
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          className={cn(
            "pointer-events-none z-[120] w-max max-w-[min(15rem,calc(100vw-1rem))] rounded-lg bg-[color:var(--jd-ink)] px-2.5 py-[7px] text-xs font-medium leading-[1.3] text-[color:var(--jd-page)] outline-none",
            "origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-jd-fade-in data-[state=closed]:animate-jd-fade-out",
            stamp.className,
          )}
        >
          {label}
          {shortcutText && <kbd className="ml-2 font-[family-name:var(--font-jd-body)] text-[11px] opacity-80">{shortcutText}</kbd>}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
