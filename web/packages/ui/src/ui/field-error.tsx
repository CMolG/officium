import type { ComponentProps } from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";

/**
 * FieldError: an invalid field names the problem and the fix under itself, in words, with a shape
 * (Lib-Controls § Input). Point the field's `aria-describedby` at its `id`.
 */
export function FieldError({ className, children, ...rest }: ComponentProps<"p">) {
  return (
    <p
      data-jd-component="FieldError"
      className={cn("flex flex-row items-start gap-1.5 text-xs leading-normal text-[color:var(--jd-danger)]", className)}
      {...rest}
    >
      <Glyph name="x-circle" size={14} className="mt-px" />
      <span>{children}</span>
    </p>
  );
}
