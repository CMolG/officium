"use client";

import { useEffect, useRef, type RefObject } from "react";
import { centerOn, clampZoom, useEngine, zoomAt, type CameraState } from "@javadaba/ui/canvas";

/** The font size of an element in px (rem when it is the page's): the layout and the keyboard step are in rem, the engine's world is px. */
export function remOf(el: Element): number {
  return parseFloat(getComputedStyle(el).fontSize) || 16;
}

/** Left-drag on the empty map pans it; the engine would start a selection marquee, which a read-only map has no use for. */
export function vetoPlainDrag(event: PointerEvent | WheelEvent | MouseEvent): boolean {
  return !(event.type === "pointerdown" && event.button === 0 && !event.altKey);
}

const KEY_STEP_REM = 3;
const ZOOM_STEP = 0.25;
/** Below this a card is too small to read: a bigger map is fitted at this zoom, from its top left, and panned. */
const READABLE_ZOOM = 0.6;

/**
 * What the shared canvas engine does not give a map you only look at, built on its camera: drag
 * to pan, trackpad / wheel scroll to pan, arrows to pan, + and - to zoom, 0 to fit. (The engine
 * itself offers Alt/middle drag and Ctrl/Cmd+wheel, which keep working.)
 */
export function useMapControls(box: RefObject<HTMLDivElement | null>, bounds: { width: number; height: number } | null) {
  const engine = useEngine();
  const fitted = useRef(false);

  const lastFit = useRef<CameraState | null>(null);
  const fit = () => {
    const el = box.current;
    if (!el || !bounds) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const margin = remOf(el);
    const whole = Math.min(1, (rect.width - 2 * margin) / bounds.width, (rect.height - 2 * margin) / bounds.height);
    const zoom = clampZoom(Math.max(whole, READABLE_ZOOM));
    const centered = centerOn({ x: 0, y: 0, width: bounds.width, height: bounds.height }, { width: rect.width, height: rect.height }, zoom);
    const pan = { x: bounds.width * zoom > rect.width - 2 * margin ? margin : centered.x, y: bounds.height * zoom > rect.height - 2 * margin ? margin : centered.y };
    const camera = { zoom, pan };
    lastFit.current = camera;
    engine.setState({ camera });
  };

  const zoomBy = (direction: 1 | -1) => {
    const el = box.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const camera = engine.getState().camera;
    engine.setState({ camera: zoomAt(camera, { x: rect.width / 2, y: rect.height / 2 }, direction * ZOOM_STEP * camera.zoom) });
  };

  // The listeners below are attached once; they call whatever fit and zoomBy are current.
  const latest = useRef({ fit, zoomBy });
  useEffect(() => {
    latest.current = { fit, zoomBy };
  });

  // The first drawing is fitted; a live redraw keeps wherever the person has put the camera.
  useEffect(() => {
    if (fitted.current || !bounds) return;
    fitted.current = true;
    latest.current.fit();
  }, [bounds]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const panBy = (dx: number, dy: number) => {
      const camera = engine.getState().camera;
      engine.setState({ camera: { ...camera, pan: { x: camera.pan.x + dx, y: camera.pan.y + dy } } });
    };
    let drag: { id: number; x: number; y: number } | null = null;

    const onDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (e.button !== 0 || e.altKey || target.closest("[data-map-node], [data-map-control]")) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      panBy(e.clientX - drag.x, e.clientY - drag.y);
      drag = { ...drag, x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (drag?.id === e.pointerId) drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return; // the engine zooms on these
      e.preventDefault();
      panBy(-e.deltaX, -e.deltaY);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("[data-map-node], [data-map-control]") || e.ctrlKey || e.metaKey || e.altKey) return;
      const step = KEY_STEP_REM * remOf(el);
      const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      const move = moves[e.key];
      if (move) panBy(move[0], move[1]);
      else if (e.key === "+" || e.key === "=") latest.current.zoomBy(1);
      else if (e.key === "-") latest.current.zoomBy(-1);
      else if (e.key === "0") latest.current.fit();
      else return;
      e.preventDefault();
    };

    // The box changes size (the side panel opens, the window resizes): a map still where fit left it is fitted again.
    const resized = new ResizeObserver(() => {
      if (lastFit.current && engine.getState().camera === lastFit.current) latest.current.fit();
    });
    resized.observe(el);

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("keydown", onKey);
    return () => {
      resized.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("keydown", onKey);
    };
  }, [box, engine]);

  return { fit, zoomIn: () => zoomBy(1), zoomOut: () => zoomBy(-1) };
}
