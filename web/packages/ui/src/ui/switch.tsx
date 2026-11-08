"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { Glyph } from "./glyph";

/*
 * Switch — acts at once and lives in settings (Lib-Controls § Switch · Checkbox · Radio).
 *
 * 48 by 28. ON is an ink track with a white knob that carries a tick; OFF is a white track with a
 * 1 px control-border ring and a faint knob. Position and the tick tell the state, not color alone,
 * so it reads in grayscale. A disabled switch keeps its place on a stone track; the reason it is
 * off ("Turned off by your organization.") is the caption the caller writes beside it.
 */

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer group relative inline-flex h-7 w-12 shrink-0 cursor-pointer flex-row items-center rounded-full p-0",
      "transition-colors duration-[var(--jd-dur-fast)]",
      FOCUS_RING,
      "data-[state=checked]:bg-[color:var(--jd-ink)]",
      "data-[state=unchecked]:bg-[color:var(--jd-raised)] data-[state=unchecked]:shadow-[inset_0_0_0_1px_var(--jd-control-border)]",
      "disabled:cursor-not-allowed disabled:bg-[color:var(--jd-disabled)] disabled:shadow-none",
      className,
    )}
    data-jd-component="Switch"
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "group/knob pointer-events-none flex size-[22px] flex-row items-center justify-center rounded-full",
        "translate-x-[3px] transition-transform duration-[var(--jd-dur-base)] ease-[var(--ease-jd)] motion-reduce:transition-none",
        "data-[state=checked]:translate-x-[23px] data-[state=checked]:bg-[color:var(--jd-raised)] data-[state=checked]:text-[color:var(--jd-ink)]",
        "data-[state=checked]:shadow-[0_1px_3px_rgba(17,17,17,0.3)]",
        "data-[state=unchecked]:bg-[color:var(--jd-faint)]",
        "group-disabled:bg-[color:var(--jd-raised)] group-disabled:shadow-none",
      )}
    >
      <Glyph name="check" size={12} className="hidden group-data-[state=checked]/knob:block" />
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
