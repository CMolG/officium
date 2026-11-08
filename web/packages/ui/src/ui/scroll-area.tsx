"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "../lib/cn";
import { FADE_MASK, useScrollFade } from "../lib/use-scroll-fade";

/*
 * ScrollArea — the ecosystem's scrolling area and its scrollbar (Lib-Display § Tabs · Separator ·
 * ScrollArea).
 *
 * The thumb is a thin ink bar, 4 px, that thickens to 10 on hover, and it never hides a control:
 * the track is transparent and the bar sits in its own 10 px gutter. The edge that has more content
 * fades, so the cut is a hint to scroll and not a hard slice through a line of text.
 *
 * It is the only Radix primitive in the package with visible chrome besides the controls; the thumb
 * is painted with the surface's ink (`--jd-ink`), not a shadcn palette name, so it shows on all four.
 */

const BAR = "10px";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => {
  const { ref: viewportRef, fade } = useScrollFade<HTMLDivElement>();
  return (
    <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn("h-full w-full rounded-[inherit]", fade && FADE_MASK[fade])}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollBar orientation="horizontal" />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    style={orientation === "vertical" ? { width: BAR } : { height: BAR }}
    className={cn(
      "group/bar flex touch-none select-none",
      "transition-opacity duration-[var(--jd-dur-base)] ease-[var(--ease-jd)]",
      orientation === "vertical" && "h-full",
      orientation === "horizontal" && "w-full flex-col",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn(
        "relative flex-1",
        // The visible bar is a pseudo-element, so it can thicken without moving the scrollbar.
        "before:absolute before:rounded-full before:bg-[color:var(--jd-ink)]/60 before:transition-[width,height,background-color] before:duration-[var(--jd-dur-fast)]",
        "hover:before:bg-[color:var(--jd-ink)]",
        orientation === "vertical" &&
          "before:inset-y-0 before:left-1/2 before:w-1 before:-translate-x-1/2 hover:before:w-2.5",
        orientation === "horizontal" &&
          "before:inset-x-0 before:top-1/2 before:h-1 before:-translate-y-1/2 hover:before:h-2.5",
      )}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
