"use client";

import { useCallback, useRef, type RefObject } from "react";
import type { TheaterEvent, TheaterRootProps } from "../types";
import { useAnimations } from "../../motion/animations";
import { resolveOptions } from "./resolveOptions";
import type { TheaterLatest, TheaterSession } from "./types";
import { useAutoplayTimer } from "./useAutoplayTimer";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";
import { useHiddenTabHold } from "./useHiddenTabHold";
import { useHoldActions } from "./useHoldActions";
import { useLatest } from "./useLatest";
import { useOffscreenHold } from "./useOffscreenHold";
import { usePlaybackActions } from "./usePlaybackActions";
import { useResumeOnLeave } from "./useResumeOnLeave";
import { useTheaterClock } from "./useTheaterClock";
import { useTheaterState } from "./useTheaterState";

/**
 * Everything that makes the Theater move: the state, the clock, the actions, the autoplay timer
 * and the listeners on the environment (pointer, viewport, tab visibility). What it hands back
 * is raw; `useTheaterController` shapes it into the value `useTheater()` serves. `rootRef` is the
 * Root's own element, owned by `TheaterRoot` because it has to be attached to it.
 */
export function useTheaterEngine(
  props: TheaterRootProps,
  rootRef: RefObject<HTMLElement | null>,
) {
  const { scenes, onIndexChange, onEvent } = props;
  const {
    loop,
    maxLoops,
    duration,
    pauseOnInteract,
    pauseOffscreen,
    resumeOnLeave,
  } = resolveOptions(props);

  const state = useTheaterState(props);
  const { count, index, cycle, want, ended, playing } = state;

  const sessionRef = useRef<TheaterSession>({
    elapsed: 0,
    startedAt: null,
    sceneKey: "",
    loops: 0,
    interactedCycle: -1,
  });
  const latestRef = useLatest<TheaterLatest>({
    scenes,
    onIndexChange,
    onEvent,
    loop,
    maxLoops,
    duration,
    index,
    count,
    want,
    ended,
    playing,
    cycle,
  });
  const emit = useCallback(
    (event: TheaterEvent) => latestRef.current.onEvent?.(event),
    [latestRef],
  );

  const clock = useTheaterClock(latestRef, sessionRef);
  const { hold, release } = useHoldActions(latestRef, emit, state.setHolds);
  const playback = usePlaybackActions({
    state,
    latestRef,
    sessionRef,
    emit,
    durationOf: clock.durationOf,
    pauseOnInteract,
  });

  useAutoplayTimer({
    playing,
    index,
    cycle,
    latestRef,
    sessionRef,
    durationOf: clock.durationOf,
    commit: playback.commit,
    finish: playback.finish,
    emit,
  });
  useOffscreenHold(rootRef, pauseOffscreen, hold, release, emit);
  useResumeOnLeave(rootRef, resumeOnLeave, latestRef, playback.play);
  useHiddenTabHold(hold, release);
  // Pause animations (the footer's switch) holds the frame the Theater is on, in every tab.
  const { paused: animationsPaused } = useAnimations();
  useIsoLayoutEffect(() => {
    if (!animationsPaused) return;
    hold("animations");
    return () => release("animations");
  }, [animationsPaused, hold, release]);

  return { state, ...clock, hold, release, ...playback };
}
