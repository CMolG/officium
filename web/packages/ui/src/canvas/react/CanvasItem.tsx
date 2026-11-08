'use client';

// packages/ui/src/canvas/react/CanvasItem.tsx
//
// Port of the drag pattern from `DesktopWindow.tsx:284-441` (Fluxor) / very similar to
// `Window.tsx:273-583` (web-os, same pattern family): pointer events + rAF + direct mutation of
// `style.transform` during the drag (zero re-renders) + commit to the store on release going
// through `resolveSnap` — this is where drag, toggleable snap-to-grid, and guides connect. Optional
// resize in 8 directions. z-order on pointer-down via `bringToFront`.
//
// NOTE: since `../fluxor/fluxor-ide` is out of reading scope in this run, the exact detail of
// Fluxor's pattern is reconstructed from the CONTRACT that describes the plan, not a literal
// transcription.

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { resolveSnap } from '../core/snap';
import { bringToFront } from '../core/z-order';
import { PICKUP_EVENT, type PickupDetail } from '../core/touch';
import type { Point, Rect } from '../core/types';
import { menuTarget } from '../../feedback/menu-model';
import { useCamera, useEngine, useEngineItem, useHoveredItem, useSelection, useZIndex } from './hooks';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const RESIZE_DIRS: ResizeDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const MIN_SIZE = 20;

function applyResize(rect: Rect, dir: ResizeDir, dx: number, dy: number): Rect {
  let { x, y, width, height } = rect;
  if (dir.includes('e')) width = Math.max(MIN_SIZE, rect.width + dx);
  if (dir.includes('s')) height = Math.max(MIN_SIZE, rect.height + dy);
  if (dir.includes('w')) {
    const newWidth = Math.max(MIN_SIZE, rect.width - dx);
    x = rect.x + (rect.width - newWidth);
    width = newWidth;
  }
  if (dir.includes('n')) {
    const newHeight = Math.max(MIN_SIZE, rect.height - dy);
    y = rect.y + (rect.height - newHeight);
    height = newHeight;
  }
  return { x, y, width, height };
}

export interface CanvasItemProps {
  id: string;
  children?: ReactNode;
  className?: string;
  /** Other rects (world space) to resolve snap against — normally the rest of the items. */
  obstacles?: Rect[];
  /** Enables the 8 resize handles. Defaults to false. */
  resizable?: boolean;
  /** Marks the element as a culling mask for `DottedBackground` (`data-shape-mask`). */
  shapeMask?: boolean;
}

export function CanvasItem({
  id,
  children,
  className,
  obstacles = [],
  resizable = false,
  shapeMask = false,
}: CanvasItemProps) {
  const engine = useEngine();
  const camera = useCamera();
  const item = useEngineItem(id);
  const zIndex = useZIndex(id);
  const { hoveredItemId } = useHoveredItem();
  const selected = useSelection().ids.has(id);
  const elementRef = useRef<HTMLDivElement>(null);

  const dragState = useRef<{ pointerId: number; startScreen: Point } | null>(null);
  const dragRaf = useRef<number | null>(null);
  const dragDelta = useRef<Point>({ x: 0, y: 0 });

  const resizeState = useRef<{ pointerId: number; dir: ResizeDir; startRect: Rect; startScreen: Point } | null>(null);

  const flushDragTransform = useCallback(() => {
    dragRaf.current = null;
    if (!elementRef.current || !item) return;
    const { x, y } = dragDelta.current;
    elementRef.current.style.transform = `translate(${x}px, ${y}px)`;

    const rawRect: Rect = { x: item.position.x + x, y: item.position.y + y, width: item.size.width, height: item.size.height };
    const { guides } = resolveSnap(rawRect, obstacles, engine.getState().snap);
    engine.setState({ activeGuides: guides });
  }, [item, obstacles, engine]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !item) return;
      // A finger belongs to the field: a drag moves the field, a tap selects, a long press picks the
      // item up (`useTouchField` sends it PICKUP_EVENT). Nothing here for touch.
      if (event.pointerType === 'touch') return;
      event.stopPropagation();
      engine.setState({ zOrder: bringToFront(engine.getState().zOrder, id) });
      dragState.current = { pointerId: event.pointerId, startScreen: { x: event.clientX, y: event.clientY } };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [engine, id, item],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragDelta.current = {
        x: (event.clientX - drag.startScreen.x) / camera.zoom,
        y: (event.clientY - drag.startScreen.y) / camera.zoom,
      };
      if (dragRaf.current === null) dragRaf.current = requestAnimationFrame(flushDragTransform);
    },
    [camera.zoom, flushDragTransform],
  );

  const commitDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragState.current;
      if (!drag || drag.pointerId !== event.pointerId || !item) return;
      dragState.current = null;
      delete elementRef.current?.dataset.dabaLifted;
      if (dragRaf.current !== null) {
        cancelAnimationFrame(dragRaf.current);
        dragRaf.current = null;
      }

      const delta = dragDelta.current;
      dragDelta.current = { x: 0, y: 0 };
      if (elementRef.current) elementRef.current.style.transform = '';

      const rawRect: Rect = {
        x: item.position.x + delta.x,
        y: item.position.y + delta.y,
        width: item.size.width,
        height: item.size.height,
      };
      const { pos } = resolveSnap(rawRect, obstacles, engine.getState().snap);
      const latest = engine.getState().items[id];
      engine.setState({
        activeGuides: [],
        items: latest ? { ...engine.getState().items, [id]: { ...latest, position: pos } } : engine.getState().items,
      });
    },
    [engine, id, item, obstacles],
  );

  const handleResizePointerDown = useCallback(
    (dir: ResizeDir) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 || !item) return;
      event.stopPropagation();
      resizeState.current = {
        pointerId: event.pointerId,
        dir,
        startRect: { x: item.position.x, y: item.position.y, width: item.size.width, height: item.size.height },
        startScreen: { x: event.clientX, y: event.clientY },
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [item],
  );

  const handleResizeMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const resize = resizeState.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      const dx = (event.clientX - resize.startScreen.x) / camera.zoom;
      const dy = (event.clientY - resize.startScreen.y) / camera.zoom;
      const next = applyResize(resize.startRect, resize.dir, dx, dy);
      if (elementRef.current) {
        elementRef.current.style.left = `${next.x}px`;
        elementRef.current.style.top = `${next.y}px`;
        elementRef.current.style.width = `${next.width}px`;
        elementRef.current.style.height = `${next.height}px`;
      }
    },
    [camera.zoom],
  );

  const commitResize = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const resize = resizeState.current;
      if (!resize || resize.pointerId !== event.pointerId) return;
      resizeState.current = null;
      const dx = (event.clientX - resize.startScreen.x) / camera.zoom;
      const dy = (event.clientY - resize.startScreen.y) / camera.zoom;
      const next = applyResize(resize.startRect, resize.dir, dx, dy);
      const latest = engine.getState().items[id];
      if (!latest) return;
      engine.setState({
        items: {
          ...engine.getState().items,
          [id]: { ...latest, position: { x: next.x, y: next.y }, size: { width: next.width, height: next.height } },
        },
      });
    },
    [camera.zoom, engine, id],
  );

  useEffect(
    () => () => {
      if (dragRaf.current !== null) cancelAnimationFrame(dragRaf.current);
    },
    [],
  );

  // Picked up by a long press: this item takes the finger over and moves with it, snapping like a mouse drag.
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    const onPickup = (event: Event) => {
      const { pointerId, clientX, clientY } = (event as CustomEvent<PickupDetail>).detail;
      engine.setState({ zOrder: bringToFront(engine.getState().zOrder, id), selection: { ids: new Set([id]) } });
      dragState.current = { pointerId, startScreen: { x: clientX, y: clientY } };
      element.setPointerCapture?.(pointerId);
      element.dataset.dabaLifted = 'true';
    };
    element.addEventListener(PICKUP_EVENT, onPickup);
    return () => element.removeEventListener(PICKUP_EVENT, onPickup);
  }, [engine, id, item]);

  if (!item) return null;

  return (
    <div
      ref={elementRef}
      className={['daba-item', className].filter(Boolean).join(' ')}
      data-daba-item-id={id}
      {...menuTarget(item.kind, id)}
      data-daba-highlighted={hoveredItemId === id ? 'true' : undefined}
      data-daba-selected={selected ? 'true' : undefined}
      data-shape-mask={shapeMask ? '' : undefined}
      style={{
        position: 'absolute',
        left: item.position.x,
        top: item.position.y,
        width: item.size.width,
        height: item.size.height,
        zIndex,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={commitDrag}
      onPointerCancel={commitDrag}
    >
      {children}
      {resizable &&
        RESIZE_DIRS.map((dir) => (
          <div
            key={dir}
            className={`daba-item__handle daba-item__handle--${dir}`}
            onPointerDown={handleResizePointerDown(dir)}
            onPointerMove={handleResizeMove}
            onPointerUp={commitResize}
            onPointerCancel={commitResize}
          />
        ))}
    </div>
  );
}
