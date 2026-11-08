import type { CSSProperties } from "react";
import { MARK_ASPECT, MARK_DIAMONDS, slideOut } from "./mark-data";

/*
 * The core spinner (Library 03, "Spinner · core"): the Javadaba mark as the one loading indicator. The black rombo
 * stays and the nine diamonds slide out of it along X, the nearest first, are held, and slide back in; 1.8 s a loop.
 *
 * Centered, always (user, 2026-11-02): at rest only the rombo shows, so it sits in the middle of the box; while the
 * colors come out the whole mark travels right until the full mark is centered, and goes back with them. Library 03
 * drew the rombo pinned at the right edge, which read as off-center.
 *
 * `size` is the box's width, the full mark's (24 inline beside words, 32 default, 44 in an image tile, 64 for a whole
 * page). Under reduced motion all nine stay out and nothing moves. It is decoration by default: whoever waits says
 * what is coming in words (one live region for a region, never one per tile).
 */
export type JavadabaSpinnerProps = {
  size?: 24 | 32 | 44 | 64 | number;
  /** On a dark ground the rombo turns light; the nine keep their colors. */
  tone?: "dark" | "light";
  /** Its name, when it is the only thing saying that something loads. */
  label?: string;
  className?: string;
};

const CSS = `
.jd-spin{position:relative;display:inline-block;flex:none;vertical-align:middle}
.jd-spin-m{position:absolute;inset:0;translate:-30% 0;animation:jd-spin-center 1.8s cubic-bezier(.22,1,.36,1) infinite}
.jd-spin-d{position:absolute;width:14.14%;height:35.36%;rotate:45deg;opacity:0;translate:var(--x) 0;animation:jd-spin-out 1.8s cubic-bezier(.22,1,.36,1) infinite;animation-delay:var(--dl)}
.jd-spin-k{position:absolute;left:65.86%;top:14.64%;width:28.28%;height:70.71%;rotate:45deg;background:#000000;border:1px solid;border-color:#BDBDBD #6E6E6E #8C8C8C #D6D6D6;border-radius:2px;box-sizing:border-box}
.jd-spin-light .jd-spin-k{background:#F2F1EC;border-color:rgba(255,255,255,.5)}
@keyframes jd-spin-out{0%,8%{opacity:0;translate:var(--x) 0}34%,62%{opacity:1;translate:0 0}88%,100%{opacity:0;translate:var(--x) 0}}
@keyframes jd-spin-center{0%,8%{translate:-30% 0}34%,62%{translate:0 0}88%,100%{translate:-30% 0}}
@media (prefers-reduced-motion:reduce){.jd-spin-m{animation:none;translate:0 0}.jd-spin-d{animation:none;opacity:1;translate:0 0}}
`;

export function JavadabaSpinner({ size = 32, tone = "dark", label, className }: JavadabaSpinnerProps) {
  const height = size / MARK_ASPECT;
  // The black rombo's box is 28.28% of the width; a diamond hides behind it by `units` halves of that box.
  const half = (size * 0.2828) / 2;
  return (
    <span
      className={`jd-spin${tone === "light" ? " jd-spin-light" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: size, height }}
      data-jd-component="JavadabaSpinner"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <style href="jd-spin" precedence="default">
        {CSS}
      </style>
      <span className="jd-spin-m">
        {MARK_DIAMONDS.map((diamond) => {
          const { units, delayMs } = slideOut(diamond);
          return (
            <i
              key={diamond.color}
              className="jd-spin-d"
              style={
                {
                  left: `${diamond.left}%`,
                  top: `${diamond.top}%`,
                  background: diamond.color,
                  "--x": `${+(units * half).toFixed(2)}px`,
                  "--dl": `${delayMs}ms`,
                } as CSSProperties
              }
            />
          );
        })}
        <i className="jd-spin-k" />
      </span>
    </span>
  );
}
