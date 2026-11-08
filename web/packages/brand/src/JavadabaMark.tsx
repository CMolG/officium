import type { CSSProperties } from "react";
import { MARK_ASPECT, MARK_DIAMONDS, slideOut } from "./mark-data";

/*
 * The Javadaba mark, Library 11: nine colored diamonds and a black one that holds them. Plain
 * spans and a hoisted stylesheet (the way the design draws it), so it needs nothing from the page.
 *
 *   spread  all ten, on the 10:4 canvas: a loose mark, the footer's signature. `size` is its width;
 *           it is never drawn narrower than 40 px.
 *   reveal  the navbar's: the black diamond alone, and on hover or keyboard focus of the link or
 *           button around it the nine colors slide out along X, nearest first; under reduced motion
 *           they only fade in. `size` is the black diamond's box (22 beside a 22 px wordmark).
 */
export type JavadabaMarkProps = {
  variant?: "spread" | "reveal";
  size?: number;
  className?: string;
  /** Hidden from screen readers when a name already sits beside it (the lockup does that). */
  decorative?: boolean;
  /** Reveal only: show the colors now, as a footer does. */
  open?: boolean;
};

const CSS = `
.jd-mark{position:relative;display:inline-block;flex:none}
.jd-mark-strip{position:absolute;inset:0}
.jd-mark-d{position:absolute;width:14.14%;height:35.36%;rotate:45deg}
.jd-mark-k{position:absolute;left:65.86%;top:14.64%;width:28.28%;height:70.71%;rotate:45deg;background:#000000;border:var(--jd-mark-edge,1px) solid;border-color:#BDBDBD #6E6E6E #8C8C8C #D6D6D6;border-radius:var(--jd-mark-corner,2px);box-sizing:border-box}
.jd-mark-reveal .jd-mark-strip{inset:auto;top:0;left:-150%;width:250%;height:100%}
.jd-mark-reveal .jd-mark-d{opacity:0;translate:var(--x) 0;transition:opacity 220ms ease,translate 460ms cubic-bezier(.22,1,.36,1)}
:is(a,button,[data-jd-mark-host]):is(:hover,:focus-visible) .jd-mark-reveal .jd-mark-d,.jd-mark-reveal[data-open="true"] .jd-mark-d{opacity:1;translate:0 0}
@media (prefers-reduced-motion:reduce){.jd-mark-reveal .jd-mark-d{translate:0 0;transition:opacity 150ms ease}}
`;

export function JavadabaMark({ variant = "spread", size, className, decorative, open }: JavadabaMarkProps) {
  const reveal = variant === "reveal";
  const box = reveal ? (size ?? 22) : Math.max(size ?? 120, 40);
  const height = reveal ? box : box / MARK_ASPECT;
  const half = box / 2;
  const edge = Math.max(1, +(box * 0.0078).toFixed(2));
  const style = {
    width: box,
    height,
    "--jd-mark-edge": `${reveal ? 1 : edge}px`,
    "--jd-mark-corner": `${reveal ? 2 : +(box * 0.00625).toFixed(2)}px`,
  } as CSSProperties;
  return (
    <span
      className={`jd-mark ${reveal ? "jd-mark-reveal" : ""}${className ? ` ${className}` : ""}`}
      data-open={reveal && open ? "true" : undefined}
      style={style}
      {...(decorative
        ? { "aria-hidden": true }
        : {
            role: "img",
            "aria-label": "The Javadaba mark: nine colored diamonds and one black diamond fitted together.",
          })}
    >
      <style href="jd-mark" precedence="default">
        {CSS}
      </style>
      <span className="jd-mark-strip">
        {MARK_DIAMONDS.map((diamond) => {
          const { units, delayMs } = slideOut(diamond);
          return (
            <i
              key={diamond.color}
              className="jd-mark-d"
              style={{
                left: `${diamond.left}%`,
                top: `${diamond.top}%`,
                background: diamond.color,
                ...(reveal ? ({ "--x": `${+(units * half).toFixed(2)}px`, transitionDelay: `${delayMs}ms` } as CSSProperties) : {}),
              }}
            />
          );
        })}
        <i className="jd-mark-k" />
      </span>
    </span>
  );
}
