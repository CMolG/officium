"use client";

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { prefersReducedMotion } from "@javadaba/sdk/platform";

/** The attribute a card carries (its id) so its movement can be animated. */
const FLIP_ATTR = "data-flip-id";

// `--jd-dur-slow` and `--ease-jd` from `tokens.css`: WAAPI takes numbers, not custom properties.
const DURATION_MS = 400;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * Cards glide to where a change puts them instead of teleporting (user decision, 2026-09-15:
 * "you have to be able to see the cards moving"). FLIP: `snapshot()` records where every card
 * under `ref` is right BEFORE new data is set; once React commits `commit`, each card that moved
 * is played from its old box to its new one, and a card that did not exist before rises in.
 *
 * The snapshot is explicit (the caller takes it next to the `setState` that moves cards) rather
 * than kept from the previous render, because between two renders a column can scroll or the
 * window resize: a stale box would animate a card that never moved.
 *
 * Web Animations on the card itself, not a View Transition: a view transition snapshots the
 * whole document and paints it as an overlay while it runs, which is exactly when a person is
 * trying to click the next card. Offsets are divided by the element's scale, so a board drawn
 * inside a scaled frame (the product page's Theater) moves by its own pixels.
 */
export function useCardFlip<T extends HTMLElement>(commit: unknown): { ref: RefObject<T | null>; snapshot: () => void } {
  const ref = useRef<T>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);

  const snapshot = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    before.current = new Map(
      Array.from(node.querySelectorAll<HTMLElement>(`[${FLIP_ATTR}]`), (el) => [el.getAttribute(FLIP_ATTR)!, el.getBoundingClientRect()]),
    );
  }, []);

  useLayoutEffect(() => {
    const previous = before.current;
    before.current = null;
    const node = ref.current;
    // The JDB-238 motion policy's two gates, same as `globals.css`: the OS preference and a
    // low-capability device (`data-capability`, stamped by `AppShellClient`).
    if (!previous || !node || node.closest('[data-capability="low"]')) return;
    if (prefersReducedMotion()) return;

    for (const el of node.querySelectorAll<HTMLElement>(`[${FLIP_ATTR}]`)) {
      const box = el.getBoundingClientRect();
      const was = previous.get(el.getAttribute(FLIP_ATTR)!);
      if (!was) {
        el.animate([{ opacity: 0, transform: "translateY(8px) scale(0.97)" }, { opacity: 1, transform: "none" }], {
          duration: DURATION_MS,
          easing: EASE,
        });
        continue;
      }
      const scale = el.offsetWidth ? box.width / el.offsetWidth : 1;
      const dx = (was.left - box.left) / scale;
      const dy = (was.top - box.top) / scale;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
        duration: DURATION_MS,
        easing: EASE,
      });
    }
  }, [commit]);

  return { ref, snapshot };
}
