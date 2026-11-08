"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";

export interface DialogCloseButtonProps {
  /** The button's name. English by default, as `Dialog`'s own sheet close; a product in another language passes its own. */
  label?: string;
  className?: string;
}

/**
 * The close a dialog draws in its header at every width (Lib-Overlays § Dialog): a 40 px icon button
 * pulled into the corner so it does not push the title down. The phone sheet draws its own on the left
 * (`DialogContent`), so a header that uses this one hides it below `sm` with `max-sm:hidden` when
 * both would show.
 */
export function DialogCloseButton({ label = "Close", className }: DialogCloseButtonProps) {
  return (
    <DialogPrimitive.Close asChild>
      <IconButton aria-label={label} className={cn("-mr-2 -mt-2", className)}>
        <Glyph name="x" size={18} />
      </IconButton>
    </DialogPrimitive.Close>
  );
}
