"use client";

import { useState, type RefObject } from "react";
import type { TheaterCursor, TheaterScene } from "../types";
import { CURSOR } from "../icons";
import type { CursorPosition } from "../hooks/cursorGeometry";
import { useCursorTarget } from "../hooks/useCursorTarget";
import { useCursorTour } from "../hooks/useCursorTour";
import { useLatest } from "../hooks/useLatest";
import { useTheater } from "../hooks/useTheater";

export interface GhostCursorProps {
  cursor: TheaterScene["cursor"];
  cycle: number;
  stageRef: RefObject<HTMLDivElement | null>;
}

export function GhostCursor({ cursor, cycle, stageRef }: GhostCursorProps) {
  const { playing, paused, getElapsed, scene } = useTheater();
  const playingRef = useLatest(playing);
  // Last resolved position and which cycle; kept so it can fade out where it was.
  // `press` counts the path's clicks: each one restarts the press animation.
  const [resolved, setPos] = useState<CursorPosition | null>(null);
  const tour = Array.isArray(cursor)
    ? (cursor as readonly TheaterCursor[])
    : null;
  const single = tour ? null : (cursor as TheaterCursor | null | undefined);
  // A fixed point needs no measuring: it is derived, not stored, so it is right in the same render.
  const fixed: CursorPosition | null =
    single && !single.target
      ? { x: single.x ?? 50, y: single.y ?? 50, cycle, press: 1 }
      : null;
  const pos = fixed ?? resolved;

  useCursorTour({
    tour,
    playing,
    cycle,
    getElapsed,
    stageRef,
    playingRef,
    setPos,
  });
  useCursorTarget({ single, cycle, stageRef, playingRef, setPos });

  const arrived = pos?.cycle === cycle;
  const click =
    arrived && (tour ? (pos?.press ?? 0) > 0 : Boolean(single?.click));
  // A path hides itself when the viewer takes control (pause): their own pointer is the
  // one in charge, and two cursors on the same scene are confusing.
  const visible = Boolean(cursor) && pos != null && !(tour && paused);

  return (
    <div
      className="theater__cursor"
      data-visible={visible}
      data-click={click}
      style={pos ? { left: `${pos.x}%`, top: `${pos.y}%` } : undefined}
      aria-hidden="true"
    >
      <span
        key={click ? `${cycle}:${pos?.press}` : -1}
        className="theater__press"
      >
        {click ? <span className="theater__ripple" /> : null}
        {CURSOR}
      </span>
      {scene?.cursorLabel ? (
        <span className="theater__ghost-name">{scene.cursorLabel}</span>
      ) : null}
    </div>
  );
}
