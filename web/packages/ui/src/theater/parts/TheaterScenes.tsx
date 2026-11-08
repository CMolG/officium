"use client";

import type { TheaterPartProps } from "../types";
import { cx } from "../constants";
import { useTheater } from "../hooks/useTheater";

/**
 * The scene timeline: one segment per scene, done (muted, full), playing (ink, bold, filling) or
 * next (empty). It says which scene is showing, jumps to one, and the playing segment fills as the
 * scene plays, as the board draws it (46% in its sample). The fill is a CSS animation of the scene's
 * own duration, started with the scene and held with it (`animation-play-state` follows `playing`),
 * so it is full exactly when the scene ends and needs no timer of its own: the earlier progress bar
 * (removed 2026-09-22) read the clock and reached the end before the scene did. With one scene there
 * is nothing to choose, so it is not painted.
 */
export function TheaterScenes({ className, style }: TheaterPartProps) {
  const { scenes, index, cycle, playing, durationOf, goTo, labels } = useTheater();
  if (scenes.length < 2) return null;

  return (
    <nav
      className={cx("theater__scenes", className)}
      style={style}
      aria-label={labels.scenes}
    >
      {scenes.map((s, i) => {
        const name = s.title ?? s.route;
        return (
          <button
            key={s.id}
            type="button"
            className="theater__segment"
            data-state={i < index ? "done" : i === index ? "playing" : "next"}
            aria-label={labels.scene(i + 1, scenes.length, name)}
            aria-current={i === index || undefined}
            title={name}
            onClick={() => goTo(i)}
          >
            {name}
            <i>
              <span
                key={i === index ? `playing-${cycle}` : "idle"}
                style={
                  i === index
                    ? { animationDuration: `${durationOf(i)}ms`, animationPlayState: playing ? "running" : "paused" }
                    : undefined
                }
              />
            </i>
          </button>
        );
      })}
    </nav>
  );
}
