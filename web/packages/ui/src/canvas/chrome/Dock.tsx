'use client';

// packages/ui/src/canvas/chrome/Dock.tsx
//
// Port of the `Dock.tsx` shell (Fluxor, floating bottom-centered,
// tooltips, `aria-pressed` active states, popover) with a declarative
// model: `DockItemSpec` + injected handlers (Fluxor's domain `switch`
// dies). Drag-out with pointer events (floating ghost), consistent with
// the rest of the engine (no dnd-kit).
//
// Contract gaps closed (Task 11 of plan #20, verified against the real
// `Dock.tsx`/`DockPopover.tsx`/`index.css` from `../fluxor/fluxor-ide`):
// testId passthrough, custom `renderTooltip` (with the shared `Tooltip` as
// the default: hover, focus and a long press on touch), configurable `dragOutTrigger` (default: the usual
// omnidirectional hypot>24), popover on click (default) or hover with
// Fluxor's closing semantics. All 5 are ADDITIVE: no existing prop
// changes type or default behavior.

import { Fragment, useCallback, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Tooltip } from '../../ui/tooltip';
import type { Point } from '../core/types';
import { DockPopover } from './DockPopover';

/**
 * Controls that `DockItemSpec.popover` receives as an argument. Mostly
 * meant for "close on select": the popover's content (the consumer's)
 * can close itself in response to an internal action (e.g. Fluxor:
 * picking "Square" in the "mental mode" submenu closes the popover
 * instantly, without waiting for the pointer to leave). In
 * `popoverOpenOn: 'hover'` mode the popover ALSO closes when the pointer
 * leaves (`onPointerLeave`), independently — `close()` does not replace
 * that closing, it is an additional one under the content's control.
 */
export interface DockPopoverControls {
  close(): void;
}

export interface DockItemSpec {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect?(): void;
  /**
   * Whether the item is on (rendered as `aria-pressed`). A VALUE on purpose ([[JDB-269]]): React
   * Compiler memoises what a render derives from its props, so a getter read during render is
   * cached against an `items` array that kept its identity while the state behind it moved. A
   * value changes the props, and the compiler sees it.
   */
  active?: boolean;
  /**
   * @deprecated Use `active`. Read during render, so it goes stale under React Compiler when the
   * consumer keeps the same `items` array; kept only for satellites written against it. `active`
   * wins when both are given.
   */
  isActive?(): boolean;
  /** Dragging outside the dock produces `onDragOut(item, screenPos)` instead of `onSelect`. */
  dragOutSpawn?: boolean;
  /**
   * If present, a normal click opens this popover instead of calling
   * `onSelect` — except in `popoverOpenOn: 'hover'` (see below), where
   * the click DOES call `onSelect` because the popover is already
   * governed by the pointer. Receives `DockPopoverControls` (see above)
   * — an existing 0-argument function is still assignable here (TS
   * allows ignoring extra arguments), so this does not break specs
   * written against the previous signature.
   */
  popover?: (controls: DockPopoverControls) => ReactNode;
  /**
   * How `popover` opens/closes. `'click'` (default): toggles the popover
   * on click, replacing `onSelect` — unchanged behavior. `'hover'`: opens
   * when the pointer enters and closes when it leaves (Fluxor's "mental
   * mode"-style submenu — `onPointerEnter`/`onPointerLeave`); in this
   * mode the click does not touch the popover and calls `onSelect`
   * normally, because in Fluxor the main toggle (click) and the submenu
   * (hover) are independent actions on the same button.
   */
  popoverOpenOn?: 'click' | 'hover';
  /** `data-testid` passthrough for the item's button (default: no testid). */
  testId?: string;
  /**
   * Additional CSS classes for the item's button, ADDED to the
   * `daba-dock__item` base (they do not replace it). A consumer that
   * rebuilds its `DockItemSpec[]` on every render can pass a dynamic
   * string here (e.g. Fluxor: `dock-item-active` only while the toggle
   * is active) without the engine needing to know anything about that
   * domain logic.
   */
  className?: string;
  /** Additional CSS class for this item's popover (passed to `DockPopoverProps.className`, default: no extra class). */
  popoverClassName?: string;
  /** `aria-label` for this item's popover (passed to `DockPopoverProps.ariaLabel`, default: no aria-label). */
  popoverAriaLabel?: string;
  /**
   * Renders `aria-current="true"` on the button when it is `true`
   * (default: omitted, not `"false"` — `aria-current` is absent/present,
   * not a two-valued boolean). Fluxor uses it on plugin items that
   * already have a window open.
   */
  ariaCurrent?: boolean;
}

/**
 * Context that `dragOutTrigger` receives on every evaluation — during
 * the drag (to decide whether to show the ghost) and again on release
 * (for the final decision), same as Fluxor: it is NOT a "first time it
 * crosses the threshold it stays stuck," it gets recalculated live, so
 * re-entering the valid zone before releasing cancels the drag-out.
 */
export interface DragOutContext {
  /** Horizontal displacement from the `pointerdown`, in screen pixels. */
  dx: number;
  /** Vertical displacement from the `pointerdown`, in screen pixels. */
  dy: number;
  /** Current pointer position, in client coordinates. */
  clientX: number;
  clientY: number;
  /** `getBoundingClientRect()` of the dock's container — e.g. for triggers relative to its edges (Fluxor: upward only, `clientY < dockRect.top - 20`). */
  dockRect: DOMRect;
}

export interface DockProps {
  items: DockItemSpec[];
  onDragOut?(item: DockItemSpec, screenPos: Point): void;
  /** Extra slot (e.g. Fluxor's attachables strip). Rendered inside the bar, after `items`. */
  children?: ReactNode;
  className?: string;
  /** `data-testid` passthrough for the dock's root div (default: no testid). */
  testId?: string;
  /** `aria-label` for the dock's root div (default: `'Dock'`, no change from previous behavior). */
  ariaLabel?: string;
  /**
   * Custom per-item tooltip, rendered inside the button (the same
   * positioned container as the icon) while the pointer is over it, the
   * item is not being dragged, and its popover (if it has one) is not
   * open. Default (omitted): the shared `Tooltip` names the item
   * (hover after 500 ms, keyboard focus, and a long press on touch) —
   * passing `renderTooltip` replaces it entirely (both never render at
   * the same time).
   */
  renderTooltip?(item: DockItemSpec): ReactNode;
  /**
   * Decides whether the current gesture counts as "drag out" (fires
   * `onDragOut` instead of `onSelect`/popover on release, and in the
   * meantime governs whether the ghost is shown). Default:
   * omnidirectional, `Math.hypot(dx, dy) > 24`.
   */
  dragOutTrigger?(ctx: DragOutContext): boolean;
}

const DRAG_OUT_THRESHOLD_PX = 24;

function defaultDragOutTrigger({ dx, dy }: DragOutContext): boolean {
  return Math.hypot(dx, dy) > DRAG_OUT_THRESHOLD_PX;
}

interface PressState {
  pointerId: number;
  item: DockItemSpec;
  startScreen: Point;
  /**
   * Whether this item's popover was already open at the moment of
   * `pointerdown`. A deliberate snapshot (the "live" state is not
   * reread on release): `DockPopover`'s "click outside closes" listener
   * lives on `document` and can close the popover BETWEEN this same
   * click's down and up (the triggering button is technically "outside"
   * the popover's own div). If the toggle below reread the state on
   * release instead of trusting this snapshot, that intermediate close
   * would make it reopen in the very same gesture that was meant to
   * close it.
   */
  popoverWasOpen: boolean;
}

export function Dock({
  items,
  onDragOut,
  children,
  className,
  testId,
  ariaLabel = 'Dock',
  renderTooltip,
  dragOutTrigger = defaultDragOutTrigger,
}: DockProps) {
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [ghost, setGhost] = useState<{ item: DockItemSpec; pos: Point } | null>(null);
  const pressState = useRef<PressState | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (item: DockItemSpec) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return;
      pressState.current = {
        pointerId: event.pointerId,
        item,
        startScreen: { x: event.clientX, y: event.clientY },
        popoverWasOpen: openPopoverId === item.id,
      };
      // Pointer Capture is not implemented in every environment (e.g.
      // jsdom, used by this file's tests) — in a real browser it
      // guarantees pointermove/pointerup keep reaching this button even
      // if the cursor leaves its area during the drag.
      if (item.dragOutSpawn) event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [openPopoverId],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const press = pressState.current;
      if (!press || press.pointerId !== event.pointerId || !press.item.dragOutSpawn) return;
      const dockRect = dockRef.current?.getBoundingClientRect();
      if (!dockRect) return;
      const dx = event.clientX - press.startScreen.x;
      const dy = event.clientY - press.startScreen.y;
      const isOut = dragOutTrigger({ dx, dy, clientX: event.clientX, clientY: event.clientY, dockRect });
      setGhost(isOut ? { item: press.item, pos: { x: event.clientX, y: event.clientY } } : null);
    },
    [dragOutTrigger],
  );

  const endPress = useCallback(
    (item: DockItemSpec) => (event: ReactPointerEvent<HTMLButtonElement>) => {
      const press = pressState.current;
      pressState.current = null;
      if (!press || press.pointerId !== event.pointerId) return;
      setGhost(null);

      if (press.item.dragOutSpawn) {
        const dockRect = dockRef.current?.getBoundingClientRect();
        const dx = event.clientX - press.startScreen.x;
        const dy = event.clientY - press.startScreen.y;
        const isOut =
          !!dockRect && dragOutTrigger({ dx, dy, clientX: event.clientX, clientY: event.clientY, dockRect });
        if (isOut) {
          onDragOut?.(item, { x: event.clientX, y: event.clientY });
          return;
        }
      }

      // Simple click (no drag-out): popover in 'click' mode (default)
      // or onSelect. In 'hover' mode the popover already opens/closes
      // by pointer (see handlePointerEnter/Leave below) and the click
      // does not touch it. The toggle uses the `popoverWasOpen` snapshot
      // (it does not reread `openPopoverId` live) — see the comment on
      // `PressState`.
      if (item.popover && (item.popoverOpenOn ?? 'click') === 'click') {
        setOpenPopoverId(press.popoverWasOpen ? null : item.id);
      } else {
        item.onSelect?.();
      }
    },
    [onDragOut, dragOutTrigger],
  );

  const cancelPress = useCallback(() => {
    pressState.current = null;
    setGhost(null);
  }, []);

  const handlePointerEnter = useCallback(
    (item: DockItemSpec) => () => {
      setHoveredId(item.id);
      if (item.popover && item.popoverOpenOn === 'hover') setOpenPopoverId(item.id);
    },
    [],
  );

  const handlePointerLeave = useCallback(
    (item: DockItemSpec) => () => {
      setHoveredId((current) => (current === item.id ? null : current));
      if (item.popover && item.popoverOpenOn === 'hover') {
        setOpenPopoverId((current) => (current === item.id ? null : current));
      }
    },
    [],
  );

  // A single close shared by `DockPopover`'s click-outside/Escape
  // (`onClose`) and by `DockPopoverControls.close()`, which the
  // consumer's content receives — closing "from outside" and "from
  // inside" are the same gesture (removing `openPopoverId`), so they
  // share the same function instead of duplicating the logic.
  const closePopover = useCallback(() => setOpenPopoverId(null), []);

  return (
    <div
      ref={dockRef}
      className={['daba-dock', className].filter(Boolean).join(' ')}
      role="toolbar"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {items.map((item) => {
        const showTooltip =
          !!renderTooltip && hoveredId === item.id && openPopoverId !== item.id && ghost?.item.id !== item.id;
        const button = (
          <button
            type="button"
            className={['daba-dock__item', item.className].filter(Boolean).join(' ')}
            aria-label={item.label}
            aria-pressed={item.active ?? (item.isActive ? item.isActive() : undefined)}
            aria-current={item.ariaCurrent ? 'true' : undefined}
            data-testid={item.testId}
            onPointerDown={handlePointerDown(item)}
            onPointerMove={handlePointerMove}
            onPointerUp={endPress(item)}
            onPointerCancel={cancelPress}
            onPointerEnter={handlePointerEnter(item)}
            onPointerLeave={handlePointerLeave(item)}
          >
            {item.icon}
            {showTooltip && renderTooltip!(item)}
            {openPopoverId === item.id && item.popover && (
              <DockPopover onClose={closePopover} className={item.popoverClassName} ariaLabel={item.popoverAriaLabel}>
                {item.popover({ close: closePopover })}
              </DockPopover>
            )}
          </button>
        );
        return renderTooltip ? (
          <Fragment key={item.id}>{button}</Fragment>
        ) : (
          <Tooltip key={item.id} label={item.label}>
            {button}
          </Tooltip>
        );
      })}
      {children}
      {ghost && (
        <div
          className="daba-dock__ghost"
          style={{ position: 'fixed', left: ghost.pos.x, top: ghost.pos.y, pointerEvents: 'none' }}
        >
          {ghost.item.icon}
        </div>
      )}
    </div>
  );
}
