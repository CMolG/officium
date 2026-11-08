"use client";

import { useCallback, useMemo, type RefObject } from "react";
import type {
  TheaterActions,
  TheaterContextValue,
  TheaterLabels,
  TheaterMeta,
  TheaterRootProps,
  TheaterScene,
  TheaterState,
} from "../types";
import { DEFAULT_LABELS, normalizeRoute } from "../constants";
import { resolveOptions } from "./resolveOptions";
import { useTheaterEngine } from "./useTheaterEngine";

type EngineActions = Pick<
  ReturnType<typeof useTheaterEngine>,
  | "play"
  | "pause"
  | "toggle"
  | "next"
  | "prev"
  | "goTo"
  | "interact"
  | "open"
  | "link"
  | "report"
>;

/** The actions group of `useTheater()`: stable as long as none of the engine's callbacks change. */
function useActionsValue(
  e: EngineActions,
  hold: TheaterActions["hold"],
  release: TheaterActions["release"],
  setInteractive: TheaterActions["setInteractive"],
): TheaterActions {
  const { play, pause, toggle, next, prev, goTo, interact, open, link, report } = e;
  return useMemo(
    () => ({
      play,
      pause,
      toggle,
      next,
      prev,
      goTo,
      hold,
      release,
      interact,
      open,
      link,
      report,
      setInteractive,
    }),
    [play, pause, toggle, next, prev, goTo, hold, release, interact, open, link, report, setInteractive],
  );
}

/**
 * Shapes the engine into the three groups `useTheater()` serves — state, actions and meta — each
 * memoized on its own so a consumer that only reads one is not re-rendered by the others.
 */
export function useTheaterController(
  props: TheaterRootProps,
  rootRef: RefObject<HTMLElement | null>,
): TheaterContextValue {
  const { scenes, registry, resolve, cta, product, labels: labelsProp } = props;
  const { transition, pauseOnHover, pauseOnInteract } = resolveOptions(props);
  const engine = useTheaterEngine(props, rootRef);
  const { state, durationOf, getElapsed, hold, release } = engine;
  const {
    index,
    count,
    cycle,
    playing,
    want,
    ended,
    holds,
    interactive,
    setInteractive,
  } = state;

  const labels = useMemo<TheaterLabels>(
    () => ({ ...DEFAULT_LABELS, ...labelsProp }),
    [labelsProp],
  );

  const resolveScene = useCallback(
    (scene: TheaterScene) =>
      scene.component ??
      registry?.[scene.route] ??
      registry?.[normalizeRoute(scene.route)] ??
      resolve?.(scene.route, scene),
    [registry, resolve],
  );

  const components = useMemo(
    () => scenes.map(resolveScene),
    [scenes, resolveScene],
  );

  const stateValue: TheaterState = useMemo(
    () => ({
      scenes,
      index,
      scene: scenes[index],
      components,
      count,
      cycle,
      playing,
      paused: !want,
      ended,
      holds,
      interactive,
    }),
    [
      scenes,
      index,
      components,
      count,
      cycle,
      playing,
      want,
      ended,
      holds,
      interactive,
    ],
  );

  const actions = useActionsValue(engine, hold, release, setInteractive);

  const effectiveTransition = state.reduced ? 0 : transition;
  const meta: TheaterMeta = useMemo(
    () => ({
      transition: effectiveTransition,
      pauseOnHover,
      pauseOnInteract,
      cta,
      labels,
      product,
      durationOf,
      getElapsed,
      resolveScene,
    }),
    [
      effectiveTransition,
      pauseOnHover,
      pauseOnInteract,
      cta,
      labels,
      product,
      durationOf,
      getElapsed,
      resolveScene,
    ],
  );

  return useMemo(
    () => ({ ...stateValue, ...actions, ...meta }),
    [stateValue, actions, meta],
  );
}
