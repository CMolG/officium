"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { Glyph } from "./glyph";

/** The sheet's header: a title on the left and a 44 px Close on the right, the same at every width. */
export function SheetHeader({ className, children, closeLabel = "Close", ...props }: React.ComponentProps<"div"> & { closeLabel?: string }) {
  return (
    <div className={cn("flex flex-row items-start justify-between gap-3", className)} {...props}>
      <div className="flex min-w-0 flex-col gap-1">{children}</div>
      <DialogPrimitive.Close
        aria-label={closeLabel}
        className={cn(
          "flex size-11 shrink-0 cursor-pointer flex-row items-center justify-center rounded-[var(--radius-jd-control)] text-[color:var(--jd-ink)] transition-colors hover:bg-[color:var(--jd-hover)]",
          FOCUS_RING,
        )}
      >
        <Glyph name="x" size={20} />
      </DialogPrimitive.Close>
    </div>
  );
}
