"use client";

import { useEffect, useState } from "react";

export interface StageLayer {
  index: number;
  cycle: number;
  key: number;
}

interface StageLayers {
  active: StageLayer;
  exiting: StageLayer | null;
  /** The key the next mounted layer gets: a new scene must remount, a new cycle must not. */
  nextKey: number;
}

/**
 * Active + exiting layers, derived at render time so both exist in the same commit.
 *
 * Only a scene CHANGE mounts a new layer. Returning to the same one (the loop of a
 * single-scene Theater, or clicking the one already showing) keeps the layer and the scene: it
 * receives a new `pass` and restarts its own sequence. Remounting it used to mean an empty frame
 * and a fade from scratch on every lap — the flicker at the end (2026-09-22).
 */
export function useStageLayers(
  index: number,
  cycle: number,
  transition: number,
) {
  const [layers, setLayers] = useState<StageLayers>(() => ({
    active: { index, cycle, key: 0 },
    exiting: null,
    nextKey: 1,
  }));
  if (layers.active.index !== index) {
    setLayers({
      active: { index, cycle, key: layers.nextKey },
      exiting: transition > 0 ? layers.active : null,
      nextKey: layers.nextKey + 1,
    });
  } else if (layers.active.cycle !== cycle) {
    setLayers({ ...layers, active: { ...layers.active, cycle } });
  }

  useEffect(() => {
    if (!layers.exiting) return;
    const timer = window.setTimeout(
      () => setLayers((l) => (l.exiting ? { ...l, exiting: null } : l)),
      transition,
    );
    return () => window.clearTimeout(timer);
  }, [layers.exiting, transition]);

  return layers;
}
