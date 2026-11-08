import type { TheaterEvent, TheaterRootProps, TheaterScene } from "../types";

export type EmitEvent = (event: TheaterEvent) => void;

/** Playback bookkeeping that is never rendered: only callbacks and effects touch it. */
export interface TheaterSession {
  /** Ms already played of the current scene. */
  elapsed: number;
  /** `now()` when the clock last started, `null` while it is stopped. */
  startedAt: number | null;
  /** `${index}:${cycle}` of the scene the clock belongs to. */
  sceneKey: string;
  /** Full laps since the last user navigation. */
  loops: number;
  /** The cycle in which `interact` was last reported. */
  interactedCycle: number;
}

/** What the last render knew, for callbacks that have to stay stable across renders. */
export interface TheaterLatest {
  scenes: TheaterScene[];
  onIndexChange: TheaterRootProps["onIndexChange"];
  onEvent: TheaterRootProps["onEvent"];
  loop: boolean;
  maxLoops: number;
  duration: number;
  index: number;
  count: number;
  want: boolean;
  ended: boolean;
  playing: boolean;
  cycle: number;
}
