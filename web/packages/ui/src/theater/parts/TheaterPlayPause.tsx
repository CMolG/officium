"use client";

import { setAnimationsPaused, useAnimations } from "../../motion/animations";
import { ICON_PAUSE, ICON_PLAY } from "../icons";
import { useTheater } from "../hooks/useTheater";

/** One button, in the bar. Pause is centred on both axes; Play sits 1 px right so the triangle looks centred. */
export function TheaterPlayPause() {
  const { paused, count, labels, play, pause } = useTheater();
  const { paused: siteStill } = useAnimations();
  const still = paused || siteStill;
  const label = still ? labels.play : labels.pause;
  const press = () => {
    if (siteStill) setAnimationsPaused(false);
    else if (paused) play("control");
    else pause("control");
  };
  return (
    <button
      type="button"
      className="theater__round"
      data-play={still}
      onClick={press}
      disabled={count === 0}
      aria-label={label}
      title={label}
    >
      {still ? ICON_PLAY : ICON_PAUSE}
    </button>
  );
}
