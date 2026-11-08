"use client";

import { useCallback, type RefObject } from "react";
import type { TheaterPauseReason, TheaterPlayReason } from "../types";
import type { TheaterControllerState } from "./useTheaterState";
import type { EmitEvent, TheaterLatest, TheaterSession } from "./types";

interface PlaybackDeps {
  state: Pick<
    TheaterControllerState,
    "controlled" | "setIndexState" | "setCycle" | "setEnded" | "setWant"
  >;
  latestRef: RefObject<TheaterLatest>;
  sessionRef: RefObject<TheaterSession>;
  emit: EmitEvent;
  durationOf: (index: number) => number;
  pauseOnInteract: boolean;
}

/** Navigation and play/pause: everything a person (or the end of the sequence) can do to the Theater. */
export function usePlaybackActions({
  state: { controlled, setIndexState, setCycle, setEnded, setWant },
  latestRef,
  sessionRef,
  emit,
  durationOf,
  pauseOnInteract,
}: PlaybackDeps) {
  const commit = useCallback(
    (i: number, reason: "auto" | "user") => {
      const { count, scenes, onIndexChange } = latestRef.current;
      if (!count) return;
      const target = ((i % count) + count) % count;
      sessionRef.current.elapsed = 0;
      sessionRef.current.startedAt = null;
      if (!controlled) setIndexState(target);
      setCycle((c) => c + 1);
      onIndexChange?.(target, scenes[target]);
      emit({ type: "scene", index: target, scene: scenes[target], reason });
    },
    [controlled, latestRef, sessionRef, setIndexState, setCycle, emit],
  );

  // Any user navigation resets the lap ceiling and closes the ending screen.
  const goTo = useCallback(
    (i: number) => {
      sessionRef.current.loops = 0;
      setEnded(false);
      commit(i, "user");
    },
    [commit, sessionRef, setEnded],
  );

  const next = useCallback(
    () => goTo(latestRef.current.index + 1),
    [goTo, latestRef],
  );
  const prev = useCallback(
    () => goTo(latestRef.current.index - 1),
    [goTo, latestRef],
  );

  const finish = useCallback(() => {
    setWant(false);
    setEnded(true);
    emit({ type: "pause", reason: "ended" });
  }, [emit, setEnded, setWant]);

  const play = useCallback(
    (reason: TheaterPlayReason = "control") => {
      const { loop, count, index } = latestRef.current;
      sessionRef.current.loops = 0;
      setEnded(false);
      const atEnd =
        !loop &&
        count > 0 &&
        index === count - 1 &&
        sessionRef.current.elapsed >= durationOf(index);
      if (atEnd) commit(0, "user");
      setWant(true);
      emit({ type: "play", reason });
    },
    [commit, durationOf, emit, latestRef, sessionRef, setEnded, setWant],
  );

  const pause = useCallback(
    (reason: TheaterPauseReason = "control") => {
      if (latestRef.current.want) emit({ type: "pause", reason });
      setWant(false);
    },
    [emit, latestRef, setWant],
  );

  const toggle = useCallback(
    (reason: TheaterPlayReason & TheaterPauseReason = "control") =>
      latestRef.current.want ? pause(reason) : play(reason),
    [latestRef, pause, play],
  );

  const interact = useCallback(() => {
    const { index, scenes, cycle } = latestRef.current;
    sessionRef.current.loops = 0;
    setEnded(false);
    if (pauseOnInteract) pause("interact");
    if (sessionRef.current.interactedCycle !== cycle && scenes[index]) {
      sessionRef.current.interactedCycle = cycle;
      emit({ type: "interact", index, scene: scenes[index] });
    }
  }, [emit, latestRef, pause, pauseOnInteract, sessionRef, setEnded]);

  const open = useCallback(
    (href: string) => {
      const { index, scenes } = latestRef.current;
      emit({ type: "open", href, scene: scenes[index] });
    },
    [emit, latestRef],
  );

  const link = useCallback(
    (href: string) => {
      const { index, scenes } = latestRef.current;
      emit({ type: "link", href, scene: scenes[index] });
    },
    [emit, latestRef],
  );

  const report = useCallback(
    (kind: "missing" | "failed") => {
      const { index, scenes } = latestRef.current;
      emit({ type: "scene_error", kind, scene: scenes[index] });
    },
    [emit, latestRef],
  );

  return {
    commit,
    goTo,
    next,
    prev,
    finish,
    play,
    pause,
    toggle,
    interact,
    open,
    link,
    report,
  };
}
