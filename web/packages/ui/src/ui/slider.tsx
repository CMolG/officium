"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * Slider — a value along a track (Lib-Controls § Toggle · ToggleGroup · Slider). The track is the
 * ink at 10%, the filled part the ink, the thumb a white disc ringed in ink, so position alone
 * carries the value. The label and the readout ("Volume 40%") belong to the caller, written above it.
 */

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn("relative flex h-6 w-full flex-row touch-none select-none items-center", className)}
    data-jd-component="Slider"
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-[color:var(--jd-ink)]/10">
      <SliderPrimitive.Range className="absolute h-full bg-[color:var(--jd-ink)]" />
    </SliderPrimitive.Track>
    {/* The name goes on the thumb, the element with role="slider"; Radix names it only when there are several. */}
    <SliderPrimitive.Thumb
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "block size-5 rounded-full bg-[color:var(--jd-raised)] shadow-[0_0_0_2px_var(--jd-ink),0_1px_3px_rgba(17,17,17,0.3)]",
        "transition-shadow duration-[var(--jd-dur-fast)] hover:shadow-[0_0_0_3px_var(--jd-ink),0_1px_3px_rgba(17,17,17,0.3)]",
        FOCUS_RING,
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
