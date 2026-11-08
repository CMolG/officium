import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

/*
 * Card (Lib-Pieces § Card · Avatar): one thing. A card is EITHER a link as a whole (`LinkCard`) OR it holds its
 * own buttons (this one), never both: a link around a button is two controls in one tab stop and a press that
 * does two things. This is the card with its own actions: white, a soft edge, no lift, because nothing about
 * the whole of it goes anywhere. Put the actions at the end (a "More actions for ..." icon button, an Open
 * button); the title is plain text.
 */

export function Card({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      data-jd-component="Card"
      className={cn(
        "flex flex-col gap-2.5 rounded-[var(--radius-jd-bento-m)] bg-[color:var(--jd-raised)] p-[18px] text-[color:var(--jd-ink)] shadow-[var(--jd-shadow-1)]",
        className,
      )}
      {...rest}
    />
  );
}
