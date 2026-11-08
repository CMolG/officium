"use client";

import { useEffect, useRef } from "react";
import { useTheaterScene } from "@javadaba/ui";

export interface SceneStep<C> {
  /** Scene time (ms) the step fires at. */
  at: number;
  run: (ctx: C) => Promise<void>;
}

/**
 * Plays `steps` on the SCENE's clock (`useTheaterScene().getElapsed`), so pausing the Theater
 * freezes them and resuming carries them on in step. With reduced motion the Theater never plays
 * on its own: every step runs straight through at mount and the scene settles on its end state.
 *
 * `makeCtx` is read at fire time, so a step always sees the current repository. `passKey` names
 * one pass of the scene (a new repository is a new pass): when it changes the steps start over.
 */
export function useSceneSteps<C>(steps: readonly SceneStep<C>[], makeCtx: () => C, passKey: unknown): void {
  const scene = useTheaterScene();
  const playing = scene?.playing ?? false;
  const getElapsed = scene?.getElapsed;
  const nextRef = useRef(0);
  const makeCtxRef = useRef(makeCtx);
  // Steps await repository calls. A pause and a resume while one is still running must not start
  // the next one on top of it: every step is chained after the previous.
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    makeCtxRef.current = makeCtx;
  });

  useEffect(() => {
    nextRef.current = 0;
  }, [passKey]);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    nextRef.current = steps.length;
    chainRef.current = chainRef.current.then(async () => {
      for (const step of steps) {
        if (cancelled) return;
        await step.run(makeCtxRef.current());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [steps, passKey]);

  useEffect(() => {
    if (!playing || !getElapsed) return;
    let cancelled = false;
    let timer = 0;

    const schedule = () => {
      const index = nextRef.current;
      const step = steps[index];
      if (!step) return;
      timer = window.setTimeout(() => {
        chainRef.current = chainRef.current.then(async () => {
          if (cancelled || nextRef.current !== index) return;
          nextRef.current = index + 1;
          await step.run(makeCtxRef.current());
          if (!cancelled) schedule();
        });
      }, Math.max(0, step.at - getElapsed()));
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playing, getElapsed, passKey, steps]);
}
