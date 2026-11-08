"use client";

import { useEffect, useRef } from "react";

/**
 * Light dismiss for a `<details>` menu, added after hydration ([[JAVA-2]]).
 *
 * `ProductNavBar`'s ecosystem menu is a `<details>` so that it opens before any JavaScript runs
 * (SSR pages, crawlers). What a `<details>` cannot do on its own is close when the person is done
 * with it: a tap outside or Escape leave it open. In Fabula's reader that stranded it on a phone —
 * the bar hid, the panel stayed over the reader with its trigger off-screen, and nothing on screen
 * closed it. Mounted inside the `<details>`, this closes it on a pointer-down outside, on Escape
 * and on a second tap of its own summary, and plays the exit animation first: the panel carries
 * `data-state="closing"` until its animations finish (instantly when there are none).
 *
 * Opening stays native, so with JavaScript off the menu still opens and its links still work.
 */
export function DetailsDismiss() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const details = ref.current?.closest("details");
    const summary = details?.querySelector(":scope > summary");
    if (!details || !summary) return;

    const close = () => {
      if (!details.open || details.dataset.state === "closing") return;
      details.dataset.state = "closing";
      const finish = () => {
        details.open = false;
        delete details.dataset.state;
      };
      const running = details.getAnimations({ subtree: true });
      if (running.length === 0) finish();
      else void Promise.allSettled(running.map((animation) => animation.finished)).then(finish);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (details.open && !details.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && details.open) {
        close();
        (summary as HTMLElement).focus();
      }
    };
    const onSummaryClick = (event: Event) => {
      if (!details.open) return;
      event.preventDefault();
      close();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    summary.addEventListener("click", onSummaryClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
      summary.removeEventListener("click", onSummaryClick);
    };
  }, []);

  useEffect(() => {
    const details = ref.current?.closest("details");
    const panel = details?.querySelector<HTMLElement>(":scope > [data-jd-menu-panel]");
    if (!details || !panel || typeof panel.showPopover !== "function") return;

    /*
     * The panel goes to the browser's TOP LAYER while it is open (JAVA-219). An `absolute` panel
     * is only as high as the stacking context it was born in: in Sonus that is the content
     * column (`z-10`), and the player bar beside it (`z-20`) painted over the menu — no z-index
     * on the panel can climb out of its parent's context. The top layer is above every one of
     * them, in every app, and the node stays where React put it. Added here, after hydration,
     * because a `popover` panel is hidden until shown: the server HTML keeps the plain
     * `<details>`, which still opens with JavaScript off.
     */
    panel.popover = "manual";

    // Where `absolute right-0 mt-2` put it: right-aligned with the menu, 8 px below it. Inline,
    // because it has to beat those classes and the browser's own centring of a popover, and not
    // every app imports `tokens.css` (Aura and Quaestio don't).
    const place = () => {
      const rect = details.getBoundingClientRect();
      const right = document.documentElement.clientWidth - rect.right;
      Object.assign(panel.style, { position: "fixed", margin: "0", inset: `${rect.bottom + 8}px ${right}px auto auto` });
    };
    let frame = 0;
    const follow = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    const listen = (on: boolean) => {
      const method = on ? "addEventListener" : "removeEventListener";
      window[method]("resize", follow);
      window[method]("scroll", follow, true);
    };

    const sync = () => {
      const shown = panel.matches(":popover-open");
      if (details.open && !shown) {
        place();
        panel.showPopover();
        listen(true);
      } else if (!details.open && shown) {
        panel.hidePopover();
        listen(false);
      }
    };

    details.addEventListener("toggle", sync);
    sync();
    return () => {
      details.removeEventListener("toggle", sync);
      listen(false);
      cancelAnimationFrame(frame);
      if (panel.matches(":popover-open")) panel.hidePopover();
      panel.removeAttribute("popover");
      Object.assign(panel.style, { position: "", margin: "", inset: "" });
    };
  }, []);

  return <span ref={ref} hidden />;
}
