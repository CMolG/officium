"use client";

import type { TheaterParts } from "../types";
import { TheaterCaption } from "./TheaterCaption";
import { TheaterLoops } from "./TheaterLoops";
import { TheaterOpen } from "./TheaterOpen";
import { TheaterPlayPause } from "./TheaterPlayPause";
import { TheaterScenes } from "./TheaterScenes";

/** Whether the bar has anything to show: the caption's text is read either way, so it alone does not count. */
export const barIsOn = (p: TheaterParts) =>
  p.playPause || p.captionBar || p.scenes || p.loops || p.openApp;

/**
 * One bar under the window, one vertical centre line: Play or Pause, the caption over its scenes,
 * Loops and the way in. Each part is its own switch (`parts`); a part that is off leaves no gap.
 */
export function TheaterBar({ parts }: { parts: TheaterParts }) {
  return (
    <div className="theater__bar">
      {parts.playPause ? <TheaterPlayPause /> : null}
      <div className="theater__cap">
        <TheaterCaption visible={parts.captionBar} />
        {parts.scenes ? <TheaterScenes /> : null}
      </div>
      {parts.loops ? <TheaterLoops /> : null}
      {parts.openApp ? <TheaterOpen /> : null}
    </div>
  );
}
