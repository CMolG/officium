import type { ComponentProps } from "react";

import { cn } from "../lib/cn";

/*
 * Coin — the mark of credit, which is money in US dollars (Lib-Foundations § 08 Credit, Lib-Controls
 * `.coin`). Tokens J are gone (owner answer X05, wave 7): nobody holds a balance in them, so the disc
 * carries a dollar sign and there is no conversion to explain.
 *
 * A gold disc (#FFCD66) with an orange "$" in Doto (#FF7A06). It is a MATERIAL, like a banknote, so it
 * is the same on every surface. The ink on the gold is about 1.9:1, so it is decoration only: the
 * amount a person reads is plain text in the ink beside it, written $12.50 in tabular figures, and
 * promotional credit always says so beside the amount.
 */

export interface CoinProps extends Omit<ComponentProps<"span">, "children"> {
  /** 22 px, or 36 px for a balance card. */
  size?: "md" | "lg";
}

export function Coin({ size = "md", className, ...rest }: CoinProps) {
  return (
    <span
      aria-hidden="true"
      data-jd-component="Coin"
      className={cn(
        "flex shrink-0 flex-row items-center justify-center rounded-full bg-[color:var(--jd-currency)] font-[family-name:var(--font-jd-display)] font-black text-[color:var(--jd-currency-ink)]",
        size === "lg" ? "size-9 text-lg" : "size-[22px] text-xs",
        className,
      )}
      {...rest}
    >
      $
    </span>
  );
}
