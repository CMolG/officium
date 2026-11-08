import { cn } from "../lib/cn";
import { FOCUS_RING } from "../lib/focus-ring";
import { DetailsDismiss } from "./details-dismiss";
import { JavadabaMenuContent } from "./javadaba-menu-content";
import { isMenuEmpty, type JavadabaMenuProps } from "./javadaba-menu-parts";
import { MenuDiamond } from "./menu-diamond";

/**
 * The Javadaba menu (Lib-Chrome): the diamond opens the house. One control in every product. It turns
 * when open and carries the unread count; behind it, top to bottom: who you are, your apps, the rest
 * of the house, and how to leave.
 *
 * Out of `ProductNavBar` since 2026-09-27 because the COMPANY's nav wears it too. `<details>` and not a
 * stateful menu, because it sits on indexable SSR pages and has to work before hydration, which also
 * means the whole launcher is in the HTML a crawler reads. The session halves are slots for the same
 * reason: this piece holds no client state, the caller hands over the finished controls.
 */
export function JavadabaMenu({ sealTone = "dark", className, ...content }: JavadabaMenuProps) {
  if (isMenuEmpty(content)) return null;

  return (
    <details className={cn("group relative shrink-0", className)}>
      <summary
        className={cn(
          "relative flex size-11 cursor-pointer list-none flex-row items-center justify-center rounded-[var(--radius-jd-pill)]",
          "transition-colors duration-[var(--jd-dur-fast)] hover:bg-[color:var(--jd-ink)]/8 [&::-webkit-details-marker]:hidden",
          FOCUS_RING,
        )}
      >
        <MenuDiamond onInk={sealTone === "light"} />
      </summary>
      {/* Closes on a tap outside, Escape or a second tap, once hydrated (JAVA-2). */}
      <DetailsDismiss />
      {/* It comes in from the right edge and leaves the same way; `tokens.css` turns the travel into
          a fade under reduced motion. The entrance is keyed to `[open]`, not always on: the closed
          panel is never `display: none`, so an always-on animation played once while hidden.
          `data-jd-menu-panel` caps it at the viewport and lets it scroll (`tokens.css`): the bar is
          sticky or fixed, so a panel taller than a short screen could otherwise never show its last
          row. On a phone it spans the screen under the bar. */}
      <div
        data-jd-menu-panel
        className={cn(
          "absolute right-0 z-50 mt-2 flex w-88 flex-col rounded-[var(--radius-jd-xl)] bg-[color:var(--jd-raised)] p-3",
          "text-[color:var(--jd-ink)] shadow-[var(--jd-shadow-overlay)]",
          "max-sm:fixed max-sm:inset-x-2 max-sm:top-[4.25rem] max-sm:mt-0 max-sm:w-auto",
          "group-open:animate-jd-slide-in-right group-data-[state=closing]:animate-jd-slide-out-right",
        )}
      >
        <JavadabaMenuContent {...content} />
      </div>
    </details>
  );
}
