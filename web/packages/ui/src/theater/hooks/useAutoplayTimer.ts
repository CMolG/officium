"use client";

import { useEffect, type RefObject } from "react";
import { now } from "../constants";
import type { EmitEvent, TheaterLatest, TheaterSession } from "./types";

interface AutoplayDeps {
  playing: boolean;
  index: number;
  cycle: number;
  latestRef: RefObject<TheaterLatest>;
  sessionRef: RefObject<TheaterSession>;
  durationOf: (index: number) => number;
  commit: (index: number, reason: "auto" | "user") => void;
  finish: () => void;
  emit: EmitEvent;
}

/** Scene timer. A single setTimeout per scene; no global rAF. */
export function useAutoplayTimer({
  playing,
  index,
  cycle,
  latestRef,
  sessionRef,
  durationOf,
  commit,
  finish,
  emit,
}: AutoplayDeps) {
  useEffect(() => {
    const session = sessionRef.current;
    const key = `${index}:${cycle}`;
    if (session.sceneKey !== key) {
      session.sceneKey = key;
      session.elapsed = 0;
      session.startedAt = null;
    }
    if (!playing) return;

    session.startedAt = now();
    const remaining = Math.max(0, durationOf(index) - session.elapsed);
    const timer = window.setTimeout(() => {
      session.startedAt = null;
      const { loop, count, maxLoops } = latestRef.current;
      if (index >= count - 1) {
        if (!loop) {
          session.elapsed = durationOf(index);
          finish();
          return;
        }
        session.loops += 1;
        emit({ type: "loop_complete", loops: session.loops });
        if (session.loops >= maxLoops) {
          commit(0, "auto");
          finish();
          return;
        }
      }
      session.elapsed = 0;
      commit(index + 1, "auto");
    }, remaining);

    return () => {
      window.clearTimeout(timer);
      if (session.startedAt != null) {
        session.elapsed += now() - session.startedAt;
        session.startedAt = null;
      }
    };
  }, [
    playing,
    index,
    cycle,
    durationOf,
    commit,
    finish,
    emit,
    latestRef,
    sessionRef,
  ]);
}
