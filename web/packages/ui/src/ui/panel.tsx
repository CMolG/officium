import type { CSSProperties, ElementType, ReactNode } from "react";

import { cn } from "../lib/cn";
import type { PanelAxes, PanelMaterial, PanelRadius } from "./panel.shared";

/*
 * Panel — the ecosystem's content box, in three materials (Lib-Display § Text · Panel).
 *
 * It's the most repeated piece in the tree and the one that diverged the most: six boxes with six
 * radii, six borders, and six shadows. Here they're **one component with one axis**: the material.
 *
 * | `material` | What it is | Where it goes |
 * |---|---|---|
 * | `plain` | Stone on washi. No edge, no shadow. The bento cell. | Every cell of a page. |
 * | `glass` | Frosted: a veil and a blur of what's behind it. | Only over color or an image. |
 * | `raised` | White with a soft edge: the thing being worked on. | A document, a table, a form. |
 *
 * All three read `--jd-*`, so **the same panel works across all four surfaces**. Glass needs
 * something behind it: `backdrop-filter` over a flat background does nothing except cost GPU and, on
 * plain washi, turns muddy. Over a plain page, use `plain`.
 *
 * `interactive` is for a panel that goes somewhere: it lifts 2 px on hover (250 ms) and presses to
 * 98%. Make it a REAL link or button underneath (`as="a"`); a lift on a card that does not go
 * anywhere is a lie. Flat is the default and elevation appears only when something floats or answers a
 * pointer (Lib-Foundations § 06).
 */

export type { PanelMaterial } from "./panel.shared";

export interface PanelProps extends PanelAxes {
  as?: ElementType;
  /** An in-page anchor target (`#section`), which a box often is. */
  id?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /**
   * Everything else passes through to the tag: `data-testid`, `onClick`, `aria-*`, `role`, `href`...
   * A panel is a container, so denying it a container's attributes forces wrapping it in an extra
   * `div`, which is exactly the markup bloat this component exists to remove.
   */
  [prop: `data-${string}`]: unknown;
}

const RADII: Record<PanelRadius, string> = {
  sm: "rounded-[var(--radius-jd-sm)]",
  md: "rounded-[var(--radius-jd-md)]",
  lg: "rounded-[var(--radius-jd-lg)]",
  xl: "rounded-[var(--radius-jd-xl)]",
  bento: "rounded-[var(--radius-jd-bento-m)] md:rounded-[var(--radius-jd-xl)]",
};

const MATERIALS: Record<PanelMaterial, string> = {
  plain: "bg-[color:var(--jd-card)]",
  glass:
    "border border-[color:var(--jd-glass-border)] bg-[color:var(--jd-glass-bg)] " +
    "backdrop-blur-[var(--jd-glass-blur)] shadow-[var(--jd-shadow-2)] " +
    // The lighter top hairline is what gives the illusion of a glass edge: without it
    // the glass reads as a translucent rectangle, not as a pane.
    "border-t-[color:var(--jd-ink)]/[0.14]",
  raised: "bg-[color:var(--jd-raised)] shadow-[var(--jd-shadow-1)]",
};

export function Panel({
  material = "plain",
  radius = "md",
  interactive = false,
  as: Tag = "div",
  className,
  style,
  children,
  ...rest
}: PanelProps) {
  return (
    <Tag
      data-jd-panel={material}
      className={cn(
        RADII[radius],
        MATERIALS[material],
        interactive &&
          "block cursor-pointer text-inherit no-underline " +
            "[transition:translate_250ms_var(--ease-jd),scale_100ms_var(--ease-jd),box-shadow_250ms_var(--ease-jd)] " +
            "motion-safe:hover:-translate-y-0.5 hover:shadow-[var(--jd-shadow-3)] " +
            "motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98] " +
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-focus)]",
        className,
      )}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
