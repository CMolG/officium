"use client";

import {
  Suspense,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { TheaterScene, TheaterSceneInfo } from "../types";
import { PortalContainerProvider } from "../../lib/portal-container";
import { SceneContext, useTheater } from "../hooks/useTheater";
import { LoadingHold } from "./LoadingHold";
import { SceneErrorBoundary } from "./SceneErrorBoundary";
import { SceneFailure } from "./SceneFailure";
import { SceneSkeleton } from "./Skeleton";

export interface SceneLayerProps {
  scene: TheaterScene | undefined;
  index: number;
  pass: number;
  state: "active" | "exiting";
  style?: CSSProperties;
  fallback?: ReactNode;
}

export function SceneLayer({
  scene,
  index,
  pass,
  state,
  style,
  fallback,
}: SceneLayerProps) {
  const { components, labels, playing, getElapsed } = useTheater();
  const Comp = scene ? components[index] : undefined;
  const active = state === "active";
  const scenePlaying = active && playing;
  const info = useMemo<TheaterSceneInfo | null>(
    () =>
      scene
        ? { scene, index, active, playing: scenePlaying, getElapsed, pass }
        : null,
    [scene, index, active, scenePlaying, getElapsed, pass],
  );
  const skeleton = scene?.fallback ?? fallback ?? (
    <SceneSkeleton label={labels.loading} />
  );
  // The layer is where the scene's modals and dropdowns portal to (contract §2): drawn inside
  // the frame, scaled and clipped with it. State, not a ref, so the provider re-renders once
  // the node exists.
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  return (
    <div
      ref={setNode}
      className="theater__layer"
      data-state={state}
      style={style}
      aria-hidden={state === "exiting" || undefined}
    >
      {!scene ? null : !Comp ? (
        active ? (
          <SceneFailure kind="missing" />
        ) : null
      ) : (
        <SceneContext.Provider value={info}>
          <PortalContainerProvider value={node}>
            <SceneErrorBoundary key={scene.id} route={scene.route}>
              <Suspense
                fallback={
                  active ? <LoadingHold>{skeleton}</LoadingHold> : skeleton
                }
              >
                <Comp {...scene.props} />
              </Suspense>
            </SceneErrorBoundary>
          </PortalContainerProvider>
        </SceneContext.Provider>
      )}
    </div>
  );
}
