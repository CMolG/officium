import type { ComponentProps, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";

/*
 * LinkCard (Lib-Pieces § Card · Avatar): a card that is a link as a whole. It lifts 2 px on hover (250 ms) and
 * casts the long shadow, because the whole of it goes somewhere; it holds NO buttons of its own (that is
 * `Card`). Pass `asChild` with your router's link to keep the skin: `<LinkCard asChild><Link href=...>`. The
 * optional `cover` is the picture or the stone block above the words.
 */

export interface LinkCardProps extends ComponentProps<"a"> {
  asChild?: boolean;
  /** Above the text: a cover image or a stone block. */
  cover?: ReactNode;
}

export function LinkCard({ asChild = false, cover, className, children, ...rest }: LinkCardProps) {
  const Comp: React.ElementType = asChild ? Slot : "a";
  return (
    <Comp
      data-jd-component="LinkCard"
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-jd-bento-m)] bg-[color:var(--jd-raised)] text-[color:var(--jd-ink)] no-underline shadow-[var(--jd-shadow-1)]",
        "motion-safe:transition-[translate,box-shadow] motion-safe:duration-[var(--jd-dur-base)] motion-safe:ease-[var(--ease-jd)]",
        "motion-safe:hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(17,17,17,0.12)]",
        FOCUS_RING,
        className,
      )}
      {...rest}
    >
      {asChild ? (
        children
      ) : (
        <>
          {cover}
          <span className="flex flex-col gap-1.5 p-[18px]">{children}</span>
        </>
      )}
    </Comp>
  );
}
