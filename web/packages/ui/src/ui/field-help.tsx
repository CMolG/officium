import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

/** FieldHelp: the line under a field that says what it is for ("At least 10 characters."). The faint ink, 12 px. */
export function FieldHelp({ className, ...rest }: ComponentProps<"p">) {
  return (
    <p
      data-jd-component="FieldHelp"
      className={cn("text-xs leading-normal text-[color:var(--jd-faint)]", className)}
      {...rest}
    />
  );
}
