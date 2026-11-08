"use client";

import type { Box } from "./placement";
import { TourHole } from "./tour-hole";

/*
 * The spotlight (Library 15): the screen dims to 45% ink and one part stays lit, ringed in white.
 * The tour is modal: one invisible blocker covers the screen, so only the card answers to the pointer.
 * A step that asks the person to act on the lit part (`tryIt`) cuts the lit box out of the blocker (a
 * clip path, which hit testing honors), and only then does that part answer too. The lit box glides
 * to the next part in 250 ms; with reduced motion it jumps.
 *
 * It stacks at `TOUR_LAYER`, above any chrome a product raises (a sticky bar, a sidebar, a drawer at
 * 100): drawn below one, that part stayed bright and clickable outside the spotlight.
 *
 * Everything that moves moves by `transform`, so a glide costs the compositor and no layout: the box
 * sits at the screen's corner and is translated into place, and a jump to a part of another place or
 * size plays from where the old box was (scaled and translated) to where the new one is. A box that
 * only follows its part (a scroll settling, a panel opening) is placed at once, with no glide.
 */

/** Above every product's own layers (drawers sit at 100/101); the card takes the next one. */
const TOUR_LAYER = "z-[200]";

/** The blocker's shape: the whole screen minus the lit box. */
function cutOut(box: Box): string {
  const right = box.left + box.width;
  const bottom = box.top + box.height;
  return `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${box.left}px ${box.top}px, ${right}px ${box.top}px, ${right}px ${bottom}px, ${box.left}px ${bottom}px, ${box.left}px ${box.top}px)`;
}

export function TourSpotlight({ box, interactive = false }: { box: Box | null; interactive?: boolean }) {
  if (!box) {
    return (
      <div aria-hidden="true" data-jd-tour-scrim="" className={`fixed inset-0 ${TOUR_LAYER} bg-[color:var(--jd-scrim)]`} />
    );
  }
  return (
    <>
      <TourHole box={box} className={TOUR_LAYER} />
      <div
        aria-hidden="true"
        data-jd-tour-blocker=""
        className={`fixed inset-0 ${TOUR_LAYER} bg-transparent`}
        style={interactive ? { clipPath: cutOut(box) } : undefined}
      />
    </>
  );
}
