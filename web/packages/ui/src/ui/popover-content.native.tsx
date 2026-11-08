import type { ReactNode } from "react";

import { cn } from "../lib/cn";
import { useFocusOnToggle } from "../lib/use-focus-on-toggle.native";
import { AnchoredLayer } from "./anchored-layer.native";
import { Panel } from "./panel.native";
import type { PanelMaterial } from "./panel.shared";
import { usePopover } from "./popover-context.native";

export interface PopoverContentProps {
  /** `raised` (opaque) by default, as on the web. */
  material?: PanelMaterial;
  /** Accepted so a web call site moves over; the native sheet draws no arrow. */
  arrow?: boolean;
  align?: "start" | "center" | "end";
  className?: string;
  children?: ReactNode;
}

/** The popover's sheet: a `Panel` in an anchored layer. Focus returns to the trigger when it closes. */
export function PopoverContent({ material = "raised", align = "start", className, children }: PopoverContentProps) {
  const { open, setOpen, triggerRef, anchorRef } = usePopover();

  useFocusOnToggle(open, triggerRef);

  return (
    <AnchoredLayer open={open} onClose={() => setOpen(false)} anchorRef={anchorRef.current ? anchorRef : triggerRef} align={align} gap={8}>
      <Panel material={material} radius="lg" className={cn("min-w-44 overflow-hidden", className)}>
        {children}
      </Panel>
    </AnchoredLayer>
  );
}
