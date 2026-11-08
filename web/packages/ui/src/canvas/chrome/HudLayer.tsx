'use client';

// packages/ui/src/canvas/chrome/HudLayer.tsx
//
// Port of `HudWidgetLayer.tsx` (Fluxor, 347 LOC) with an injected
// registry: drag by header + resize (bottom-right corner) quantized to
// `core/hud-grid.ts`, commit on release. The state (visible/position/size)
// belongs to the CONSUMER (`state` prop, typically backed by its own
// storage or by a slot in the engine's store) — the engine does not own
// it, it only governs the drag/resize/clamp geometry.
//
// NOTE: since `../fluxor/fluxor-ide` is out of reading scope in this run,
// this is a reconstruction from the CONTRACT the plan describes.

import { useCallback, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { clampToViewport, snapToHudGrid } from '../core/hud-grid';
import type { Point, Rect, Size } from '../core/types';

export interface HudWidgetSpec {
  type: string;
  title: string;
  icon: ReactNode;
  defaultSize: Size;
  defaultPosition?: Point;
  /** The widget's body is defined by the consumer. */
  render(): ReactNode;
}

export interface HudWidgetState {
  visible: boolean;
  position: Point;
  size: Size;
}

export interface HudLayerProps {
  widgets: HudWidgetSpec[];
  /** State persisted by the consumer (same shape Fluxor already used in `hudWidgets`). */
  state: Record<string, HudWidgetState>;
  viewport: Size;
  safeZone?: (viewport: Size) => Rect;
  onWidgetChange(type: string, next: HudWidgetState): void;
  className?: string;
}

const MIN_WIDGET_SIZE = 120;

export function HudLayer({ widgets, state, viewport, safeZone, onWidgetChange, className }: HudLayerProps) {
  const visible = widgets.filter((widget) => state[widget.type]?.visible ?? false);

  return (
    <div className={['daba-hud-layer', className].filter(Boolean).join(' ')}>
      {visible.map((widget) => {
        const widgetState = state[widget.type] ?? {
          visible: true,
          position: widget.defaultPosition ?? { x: 0, y: 0 },
          size: widget.defaultSize,
        };
        return (
          <HudWidgetFrame
            key={widget.type}
            spec={widget}
            widgetState={widgetState}
            viewport={viewport}
            safeZone={safeZone}
            onChange={(next) => onWidgetChange(widget.type, next)}
          />
        );
      })}
    </div>
  );
}

interface HudWidgetFrameProps {
  spec: HudWidgetSpec;
  widgetState: HudWidgetState;
  viewport: Size;
  safeZone?: (viewport: Size) => Rect;
  onChange(next: HudWidgetState): void;
}

function HudWidgetFrame({ spec, widgetState, viewport, safeZone, onChange }: HudWidgetFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{ pointerId: number; startScreen: Point; startPos: Point } | null>(null);
  const resizeState = useRef<{ pointerId: number; startScreen: Point; startSize: Size } | null>(null);

  const bounds = safeZone ? safeZone(viewport) : { x: 0, y: 0, width: viewport.width, height: viewport.height };

  const handleHeaderPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragState.current = { pointerId: event.pointerId, startScreen: { x: event.clientX, y: event.clientY }, startPos: widgetState.position };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [widgetState.position]);

  const handleHeaderPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId || !frameRef.current) return;
    const nextX = drag.startPos.x + (event.clientX - drag.startScreen.x);
    const nextY = drag.startPos.y + (event.clientY - drag.startScreen.y);
    frameRef.current.style.left = `${nextX}px`;
    frameRef.current.style.top = `${nextY}px`;
  }, []);

  const commitHeaderDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragState.current = null;
      const rawX = drag.startPos.x + (event.clientX - drag.startScreen.x);
      const rawY = drag.startPos.y + (event.clientY - drag.startScreen.y);
      const snapped = { x: snapToHudGrid(rawX), y: snapToHudGrid(rawY) };
      const clamped = clampToViewport({ ...snapped, width: widgetState.size.width, height: widgetState.size.height }, viewport, bounds);
      onChange({ ...widgetState, position: { x: clamped.x, y: clamped.y } });
    },
    [viewport, bounds, widgetState, onChange],
  );

  const handleResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    resizeState.current = { pointerId: event.pointerId, startScreen: { x: event.clientX, y: event.clientY }, startSize: widgetState.size };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [widgetState.size]);

  const handleResizePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = resizeState.current;
    if (!resize || resize.pointerId !== event.pointerId || !frameRef.current) return;
    const width = Math.max(MIN_WIDGET_SIZE, resize.startSize.width + (event.clientX - resize.startScreen.x));
    const height = Math.max(MIN_WIDGET_SIZE, resize.startSize.height + (event.clientY - resize.startScreen.y));
    frameRef.current.style.width = `${width}px`;
    frameRef.current.style.height = `${height}px`;
  }, []);

  const commitResize = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const resize = resizeState.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      resizeState.current = null;
      const width = Math.max(MIN_WIDGET_SIZE, snapToHudGrid(resize.startSize.width + (event.clientX - resize.startScreen.x)));
      const height = Math.max(MIN_WIDGET_SIZE, snapToHudGrid(resize.startSize.height + (event.clientY - resize.startScreen.y)));
      const clamped = clampToViewport({ ...widgetState.position, width, height }, viewport, bounds);
      onChange({ ...widgetState, size: { width: clamped.width, height: clamped.height } });
    },
    [viewport, bounds, widgetState, onChange],
  );

  return (
    <div
      ref={frameRef}
      className="daba-hud-widget"
      data-daba-hud-widget={spec.type}
      style={{
        position: 'absolute',
        left: widgetState.position.x,
        top: widgetState.position.y,
        width: widgetState.size.width,
        height: widgetState.size.height,
      }}
    >
      <div
        className="daba-hud-widget__header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={commitHeaderDrag}
        onPointerCancel={commitHeaderDrag}
      >
        <span className="daba-hud-widget__icon">{spec.icon}</span>
        <span className="daba-hud-widget__title">{spec.title}</span>
      </div>
      <div className="daba-hud-widget__body">{spec.render()}</div>
      <div
        className="daba-hud-widget__resize-handle"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={commitResize}
        onPointerCancel={commitResize}
      />
    </div>
  );
}
