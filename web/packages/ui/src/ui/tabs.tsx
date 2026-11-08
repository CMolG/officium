"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { FADE_MASK, useScrollFade } from "../lib/use-scroll-fade";

/*
 * Tabs — quiet structure (Lib-Display § Tabs · Separator · ScrollArea).
 *
 * The current tab is marked TWICE: an ink rule under it and a heavier weight, so it reads without
 * color. A disabled tab stays where it is (the caller says why in a line beside the list, wired with
 * `aria-describedby`). On a phone the list scrolls sideways and the cut edge fades. `count` is the
 * tab's number ("Open 12"), in tabular figures.
 */

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, forwarded) => {
  const { ref, fade } = useScrollFade<HTMLDivElement>();
  const setRefs = (node: HTMLDivElement | null) => {
    ref.current = node;
    if (typeof forwarded === "function") forwarded(node);
    else if (forwarded) forwarded.current = node;
  };
  return (
    <TabsPrimitive.List
      ref={setRefs}
      className={cn(
        "-mx-1 -my-1 flex flex-row items-center gap-6 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        fade && FADE_MASK[fade],
        className,
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & { count?: number }
>(({ className, count, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex min-h-11 shrink-0 cursor-pointer flex-row items-center gap-2 whitespace-nowrap px-0.5 text-sm font-medium",
      "text-[color:var(--jd-muted)] transition-colors duration-[var(--jd-dur-fast)] hover:text-[color:var(--jd-ink)]",
      FOCUS_RING,
      "data-[state=active]:font-semibold data-[state=active]:text-[color:var(--jd-ink)] data-[state=active]:shadow-[inset_0_-2px_0_var(--jd-ink)]",
      "disabled:cursor-not-allowed disabled:text-[color:var(--jd-ink)]/40",
      className,
    )}
    data-jd-component="TabsTrigger"
    {...props}
  >
    {children}
    {count === undefined ? null : (
      <span className="text-xs font-medium tabular-nums text-[color:var(--jd-faint)]">{count}</span>
    )}
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4", FOCUS_RING, className)} {...props} />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
