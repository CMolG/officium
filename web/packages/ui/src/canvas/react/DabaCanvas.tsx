'use client';

// packages/ui/src/canvas/react/DabaCanvas.tsx
//
// Port of `SeamlessCanvas.tsx`'s mechanics (Fluxor) WITHOUT the domain: pan with the middle button
// (or Alt+drag) and ctrl/cmd+wheel zoom anchored to the cursor (both startable from any point that
// bubbles up to the canvas root, item/chrome included, not just the background), marquee with
// core/selection.ts (THIS one strict to the background), and the pan-layer with Fluxor's
// optimization (at zoom 1 only translate with integers; scale only while zooming; will-change only
// during the interaction).
//
// NOTE: since `../fluxor/fluxor-ide` is out of reading scope in this run, this is a reconstruction
// from the CONTRACT that describes the plan (gestures, the camera formula from core/camera.ts,
// pan-layer), not a literal transcription of SeamlessCanvas.tsx.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { worldToScreen, screenToWorld, zoomAt } from '../core/camera';
import { itemsInRect, rectFromDrag, type SelectableRect } from '../core/selection';
import type { Point } from '../core/types';
import { FeedbackMenuScope } from '../../feedback/menu-registry';
import type { MenuContext, MenuProviders } from '../../feedback/menu-model';
import { useCamera, useEngine } from './hooks';
import { useTouchField } from './useTouchField';

export interface DabaCanvasContextValue {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Converts a point in client (screen) coordinates to world space, using the current camera. */
  toWorld(clientPoint: Point): Point;
}

const DabaCanvasContext = createContext<DabaCanvasContextValue | null>(null);

export function useDabaCanvasContext(): DabaCanvasContextValue {
  const ctx = useContext(DabaCanvasContext);
  if (!ctx) throw new Error('This component must be rendered inside <DabaCanvas>');
  return ctx;
}

const ZOOM_WHEEL_SENSITIVITY = 0.0015;

/**
 * Type of `DabaCanvasProps.rootProps`. Plain `HTMLAttributes` doesn't type arbitrary `data-*`
 * outside of intrinsic JSX (TypeScript only grants that freedom when writing `<div data-foo="x">`
 * directly, not to an object with that shape passed as a prop) — it's widened here explicitly so
 * that `{ 'data-testid': '...' }` compiles.
 */
export type DabaCanvasRootProps = HTMLAttributes<HTMLDivElement> & {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

function defaultShouldHandleBackgroundGesture(): boolean {
  return true;
}

export interface DabaCanvasProps {
  /** Content in world space: rendered inside the pan-layer (panned/zoomed). This is where the <CanvasItem>s go. */
  children?: ReactNode;
  /**
   * Background in screen space, painted BELOW the pan-layer and outside its transform: it doesn't
   * pan or zoom with the camera. This is where `<DottedBackground/>` goes — as a child it would
   * live inside the pan-layer and the dot field would shift (and get cut off) with every pan.
   */
  background?: ReactNode;
  /** Content in screen space, untransformed (overlays like <SnapGuidesOverlay/>). */
  overlay?: ReactNode;
  /** Items that are candidates for the marquee hit-test (id + rect in world space). */
  selectableItems?: SelectableRect[];
  /**
   * The canvas's context menu, as providers keyed by the kind of item under the pointer
   * (`MENU_BACKGROUND` for the empty canvas). Each provider gets the target kind and id and the
   * pointed point in world coordinates (`ctx.worldPos`). The feedback layer draws it, with the
   * keyboard and long-press openings, so the canvas needs `FeedbackContextMenu` above it.
   */
  menu?: MenuProviders;
  /** The menu's accessible name ("Canvas actions"), or one per target. */
  menuLabel?: string | ((ctx: MenuContext) => string);
  className?: string;
  style?: CSSProperties;
  /**
   * Consulted BEFORE: starting a pointer pan, starting a marquee, processing wheel-zoom
   * (ctrl/cmd+wheel). The background context menu belongs to the feedback layer, which this function does not veto. The prior gate it's combined with
   * differs by gesture: marquee is a STRICT background gesture —
   * this function is ALWAYS consulted after confirming `event.target === event.currentTarget`,
   * never for gestures on child items/chrome. PAN (middle button, or left button + Alt) and
   * wheel-zoom (ctrl/cmd+wheel) are different: NEITHER of the two requires
   * `event.target === event.currentTarget` — they're CAMERA gestures startable from any point that
   * bubbles up to the canvas root, including on top of an item/chrome (items/chrome that do
   * `stopPropagation` on their own pointerdown/wheel are naturally excluded, and that's fine);
   * there, only their own gesture filter applies (button/modifier for pan, ctrl/cmd for wheel-zoom)
   * plus this function's veto. If it returns `false`, the engine ignores the event COMPLETELY (no
   * `preventDefault` and no `stopPropagation`) and the consumer is free to handle it on its own. It
   * receives the NATIVE event (not React's SyntheticEvent) — `PointerEvent` for pan/marquee,
   * `WheelEvent` for zoom, `MouseEvent` is accepted too (`PointerEvent extends MouseEvent`, so a handler that only needs
   * common fields like `clientX`/`ctrlKey` can ignore which of the three arrived). Default: `() => true` (no change).
   * Meant so that a consumer with its own gating logic (Fluxor: suppress with a maximized window,
   * suppress with `mentalMode` active, or keep the whole wheel-zoom because its current zoom is a
   * fixed +-0.1 step with no cursor anchoring) doesn't have to wrap/patch the engine's canvas.
   */
  shouldHandleBackgroundGesture?: (event: PointerEvent | WheelEvent | MouseEvent) => boolean;
  /**
   * Additional HTML attributes for the root div, MERGED over the engine's own (not in their place):
   * `className` is ADDED to `daba-canvas` (not replacing it), `style` is combined with the `style`
   * prop above (the latter wins on conflicts over the same key), and the rest (typically `data-*`)
   * is applied as-is. `ref` CANNOT be overridden (outside the type system: `ref` isn't part of
   * `HTMLAttributes`), nor can the engine's internal pointer/wheel/context-menu handlers — if
   * `rootProps` includes them, the engine's own win (it needs them to function). Default: no
   * additional attributes (unchanged behavior).
   */
  rootProps?: DabaCanvasRootProps;
  /** Additional CSS class for the pan-layer, ADDED to `daba-pan-layer` (default: no extra class). */
  panLayerClassName?: string;
}

export function DabaCanvas({
  children,
  background,
  overlay,
  selectableItems = [],
  menu,
  menuLabel,
  className,
  style,
  shouldHandleBackgroundGesture = defaultShouldHandleBackgroundGesture,
  rootProps,
  panLayerClassName,
}: DabaCanvasProps) {
  const engine = useEngine();
  const camera = useCamera();
  const containerRef = useRef<HTMLDivElement>(null);
  const [interacting, setInteracting] = useState(false);
  const panState = useRef<{ pointerId: number; startScreen: Point; startPan: Point } | null>(null);
  const marqueeState = useRef<{ pointerId: number; startWorld: Point } | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<{ a: Point; b: Point } | null>(null);

  const touch = useTouchField(containerRef);

  const getViewportOrigin = useCallback((): Point => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : { x: 0, y: 0 };
  }, []);

  const toWorld = useCallback(
    (clientPoint: Point): Point => screenToWorld(clientPoint, engine.getState().camera, getViewportOrigin()),
    [engine, getViewportOrigin],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (touch.onPointerDown(event)) return; // a finger moves the field (select mode steps aside)
      const isPanGesture = event.button === 1 || (event.button === 0 && event.altKey);

      if (isPanGesture) {
        // Camera gesture: startable from ANY point that bubbles up to the root (item/chrome
        // included), NOT just the background — unlike marquee/context-menu, here
        // `event.target === event.currentTarget` isn't required. Items/chrome that do
        // `stopPropagation` on their own pointerdown are naturally excluded (the event never
        // reaches here), and that's fine: they don't compete with the pan, it's the same exclusion
        // marquee/context-menu already use for their children. Only the consumer's explicit veto
        // applies.
        if (!shouldHandleBackgroundGesture(event.nativeEvent)) return; // the consumer handles this gesture on its own
        event.preventDefault();
        panState.current = {
          pointerId: event.pointerId,
          startScreen: { x: event.clientX, y: event.clientY },
          startPan: engine.getState().camera.pan,
        };
        // Pointer Capture isn't implemented in every environment (e.g. jsdom, used by this file's
        // tests) — in a real browser it guarantees that pointermove/pointerup keep arriving here
        // even if the cursor leaves the canvas during the gesture.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setInteracting(true);
        return;
      }

      // Marquee: STRICT background gesture (unlike the pan above) — both gates as always,
      // unchanged.
      if (event.target !== event.currentTarget) return; // only gestures on the background, not on child items/chrome
      if (!shouldHandleBackgroundGesture(event.nativeEvent)) return; // the consumer handles this gesture on its own

      if (event.button === 0) {
        const world = toWorld({ x: event.clientX, y: event.clientY });
        marqueeState.current = { pointerId: event.pointerId, startWorld: world };
        setMarqueeRect({ a: world, b: world });
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setInteracting(true);
      }
    },
    [engine, toWorld, shouldHandleBackgroundGesture, touch],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (touch.onPointerMove(event)) return;
      if (panState.current && panState.current.pointerId === event.pointerId) {
        const dx = event.clientX - panState.current.startScreen.x;
        const dy = event.clientY - panState.current.startScreen.y;
        engine.setState({
          camera: {
            ...engine.getState().camera,
            pan: { x: panState.current.startPan.x + dx, y: panState.current.startPan.y + dy },
          },
        });
        return;
      }
      if (marqueeState.current && marqueeState.current.pointerId === event.pointerId) {
        setMarqueeRect({ a: marqueeState.current.startWorld, b: toWorld({ x: event.clientX, y: event.clientY }) });
      }
    },
    [engine, toWorld, touch],
  );

  const endInteraction = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (touch.onPointerUp(event)) return;
      if (panState.current?.pointerId === event.pointerId) {
        panState.current = null;
        setInteracting(false);
        return;
      }
      if (marqueeState.current?.pointerId === event.pointerId) {
        if (marqueeRect) {
          const rect = rectFromDrag(marqueeRect.a, marqueeRect.b);
          const ids = itemsInRect(selectableItems, rect);
          const mode = event.shiftKey ? 'add' : 'replace';
          const current = engine.getState().selection.ids;
          const nextIds = mode === 'add' ? new Set([...current, ...ids]) : new Set(ids);
          engine.setState({ selection: { ids: nextIds } });
        }
        marqueeState.current = null;
        setMarqueeRect(null);
        setInteracting(false);
      }
    },
    [engine, marqueeRect, selectableItems, touch],
  );


  // A native listener, not React's `onWheel`: React registers wheel listeners as passive, so its
  // `preventDefault()` is refused ("Unable to preventDefault inside passive event listener") and
  // the browser zooms the whole page along with the canvas (JAVA-261).
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return; // plain wheel: normal page scroll, no intervention
      if (!shouldHandleBackgroundGesture(event)) return; // the consumer keeps this whole wheel-zoom to itself
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const anchor: Point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const currentCamera = engine.getState().camera;
      const deltaZoom = -event.deltaY * ZOOM_WHEEL_SENSITIVITY * currentCamera.zoom;
      engine.setState({ camera: zoomAt(currentCamera, anchor, deltaZoom) });
    };
    node.addEventListener('wheel', handleWheel, { passive: false });
    return () => node.removeEventListener('wheel', handleWheel);
  }, [engine, shouldHandleBackgroundGesture]);

  const contextValue: DabaCanvasContextValue = { containerRef, toWorld };

  const panLayerStyle: CSSProperties =
    camera.zoom === 1
      ? {
          transform: `translate(${Math.round(camera.pan.x)}px, ${Math.round(camera.pan.y)}px)`,
          willChange: interacting ? 'transform' : undefined,
        }
      : {
          transform: `translate(${camera.pan.x}px, ${camera.pan.y}px) scale(${camera.zoom})`,
          transformOrigin: '0 0',
          willChange: interacting ? 'transform' : undefined,
        };

  const marqueeScreenRect = marqueeRect
    ? (() => {
        const worldRect = rectFromDrag(marqueeRect.a, marqueeRect.b);
        const topLeft = worldToScreen({ x: worldRect.x, y: worldRect.y }, camera, { x: 0, y: 0 });
        return { x: topLeft.x, y: topLeft.y, width: worldRect.width * camera.zoom, height: worldRect.height * camera.zoom };
      })()
    : null;

  const canvas = (
    <DabaCanvasContext.Provider value={contextValue}>
      <div
        {...rootProps}
        ref={containerRef}
        className={['daba-canvas', rootProps?.className, className].filter(Boolean).join(' ')}
        style={{ ...rootProps?.style, ...style }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endInteraction}
        onPointerCancel={endInteraction}
      >
        {background}
        <div className={['daba-pan-layer', panLayerClassName].filter(Boolean).join(' ')} style={panLayerStyle}>
          {children}
        </div>
        {marqueeScreenRect && (
          <div
            className="daba-marquee"
            style={{
              left: marqueeScreenRect.x,
              top: marqueeScreenRect.y,
              width: marqueeScreenRect.width,
              height: marqueeScreenRect.height,
            }}
          />
        )}
        {overlay}
      </div>
    </DabaCanvasContext.Provider>
  );

  return menu ? (
    <FeedbackMenuScope providers={menu} label={menuLabel} toWorld={toWorld}>
      {canvas}
    </FeedbackMenuScope>
  ) : (
    canvas
  );
}
