import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * InlineLink — a link inside a sentence (Lib-Controls `.il`): 600 weight, a 1 px underline 4 px
 * below the text that thickens to 2 on hover. It is underlined always, because a link that is only
 * colored fails people who cannot tell the color. On a touch screen its hit area grows to 44 tall.
 */

export interface InlineLinkProps extends ComponentProps<"a"> {
  asChild?: boolean;
}

export function InlineLink({ asChild = false, className, ...rest }: InlineLinkProps) {
  const Comp: React.ElementType = asChild ? Slot : "a";
  return (
    <Comp
      data-jd-component="InlineLink"
      className={cn(
        "cursor-pointer font-semibold text-[color:var(--jd-ink)] underline decoration-1 underline-offset-4 hover:decoration-2",
        "pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center",
        FOCUS_RING,
        className,
      )}
      {...rest}
    />
  );
}
