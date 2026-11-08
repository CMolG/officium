"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import type { TheaterStageProps } from "../types";
import { cx, DEFAULT_VIEWPORT } from "../constants";
import { useFitViewport } from "../hooks/useFitViewport";
import { useLinkNote } from "../hooks/useLinkNote";
import { useStageHandlers } from "../hooks/useStageHandlers";
import { useStageLayers } from "../hooks/useStageLayers";
import { useTheater } from "../hooks/useTheater";
import { GhostCursor } from "./GhostCursor";
import { Notice } from "./Notice";
import { SceneLayer } from "./SceneLayer";
import { TheaterLinkNote } from "./TheaterLinkNote";

export function TheaterStage({
  viewport: viewportSpec = DEFAULT_VIEWPORT,
  minScale = 0.5,
  interactive = true,
  cursor = true,
  fallback,
  className,
  style,
  children,
}: TheaterStageProps) {
  const t = useTheater();
  const {
    scenes,
    scene,
    index,
    count,
    cycle,
    transition,
    labels,
    setInteractive,
  } = t;
  const ref = useRef<HTMLDivElement | null>(null);
  const { viewport, scale } = useFitViewport(ref, viewportSpec, minScale);
  const layers = useStageLayers(index, cycle, transition);
  const linkNote = useLinkNote();

  useEffect(() => {
    setInteractive(interactive);
  }, [interactive, setInteractive]);

  const handlers = useStageHandlers(t, interactive, linkNote.show);

  const layerStyle: CSSProperties | undefined = viewport
    ? {
        width: viewport.width,
        height: viewport.height,
        transform: `scale(${scale ?? 1})`,
        visibility: scale == null ? "hidden" : undefined,
      }
    : undefined;

  // Swiping over the scene scrolls the page; the scene answers presses only.
  const stageStyle: CSSProperties = viewport
    ? {
        ...style,
        touchAction: "pan-y",
        aspectRatio: `${viewport.width} / ${viewport.height}`,
      }
    : { ...style, touchAction: "pan-y" };

  const exitingScene = layers.exiting
    ? scenes[layers.exiting.index]
    : undefined;

  return (
    <div
      ref={ref}
      className={cx("theater__stage", className)}
      style={stageStyle}
      data-fit={viewport ? "viewport" : "fill"}
      data-interactive={interactive}
      tabIndex={0}
      role="group"
      aria-roledescription="scene"
      aria-label={
        count
          ? labels.scene(index + 1, count, scene?.title ?? scene?.route ?? "")
          : labels.emptyTitle
      }
      {...handlers}
    >
      {count === 0 ? (
        <Notice title={labels.emptyTitle}>{labels.emptyBody}</Notice>
      ) : (
        <>
          {layers.exiting && exitingScene ? (
            <SceneLayer
              key={layers.exiting.key}
              scene={exitingScene}
              index={layers.exiting.index}
              pass={layers.exiting.cycle}
              state="exiting"
              style={layerStyle}
              fallback={fallback}
            />
          ) : null}
          <SceneLayer
            key={layers.active.key}
            scene={scenes[layers.active.index]}
            index={layers.active.index}
            pass={layers.active.cycle}
            state="active"
            style={layerStyle}
            fallback={fallback}
          />
          {cursor ? (
            <GhostCursor cursor={scene?.cursor} cycle={cycle} stageRef={ref} />
          ) : null}
          {linkNote.shown ? <TheaterLinkNote /> : null}
          {children}
        </>
      )}
    </div>
  );
}
