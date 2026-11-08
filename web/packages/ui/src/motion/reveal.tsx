"use client";

import { viewportSize } from "@javadaba/sdk/platform";
import { useLayoutEffect, useRef, type ElementType, type HTMLAttributes } from "react";

/*
 * Reveal -- the scroll entrance of Lib-Foundations 07: a block rises ONCE as it comes into view and
 * never again on the way back up. (The old `.jd-reveal` was CSS `animation-timeline: view()`, which
 * is tied to scroll position, so it ran backwards when the person scrolled up.)
 *
 * It is a progressive enhancement on purpose: the server renders the block visible, so a crawler, a
 * page without JavaScript and the first screen are never blank. After hydration only a block that
 * starts BELOW the fold is hidden (`data-jd-reveal="pending"`), and the first time it reaches the
 * viewport it is released (`"done"`); the move itself is plain CSS in `tokens.css`. Titles that
 * paint on the first screen therefore never move ("Never on the first screen's words").
 *
 * Under reduced motion `--jd-motion-shift` is 0, so the same code is a plain fade.
 */

export type RevealProps = Omit<HTMLAttributes<HTMLElement>, "className"> & {
  as?: ElementType;
  className?: string;
};

export function Reveal({ as: Element = "div", className, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const view = viewportSize();
    if (!view || node.getBoundingClientRect().top < view.h) return;

    node.dataset.jdReveal = "pending";
    const release = (entries: IntersectionObserverEntry[]) => {
      // Scrolled past it (a jump to an anchor below): released too, the person is already beyond it.
      if (!entries.some((entry) => entry.isIntersecting || entry.boundingClientRect.top < 0)) return;
      node.dataset.jdReveal = "done";
      observer.disconnect();
    };
    const observer = new IntersectionObserver(release, { rootMargin: "0px 0px -8% 0px" });
    observer.observe(node);
    return () => {
      observer.disconnect();
      delete node.dataset.jdReveal;
    };
  }, []);

  return (
    <Element ref={ref} className={className} {...rest}>
      {children}
    </Element>
  );
}
