"use client";

import { useEffect, useState } from "react";
import { useAnimations } from "../../motion/animations";
import { useTheater } from "../hooks/useTheater";

/** The hint is said once per page load, however many Theaters it holds. */
let hintSaid = false;
const HINT_MS = 4000;

/**
 * The status pill over the window: Paused, Still, or a one-time hint. Off by default
 * (`parts.statusPill`); nothing else in a Theater ever says it is paused.
 */
export function TheaterStatus() {
  const { paused, playing, labels } = useTheater();
  const { paused: siteStill } = useAnimations();
  const [hint, setHint] = useState(false);

  useEffect(() => {
    if (!playing || hintSaid) return;
    hintSaid = true;
    setHint(true);
    const id = window.setTimeout(() => setHint(false), HINT_MS);
    return () => window.clearTimeout(id);
  }, [playing]);

  const text = siteStill
    ? labels.still
    : paused
      ? labels.paused
      : hint
        ? labels.hint
        : null;
  return (
    <div className="theater__status" data-visible={text != null} role="status">
      {text}
    </div>
  );
}
