"use client";

import * as React from "react";

export interface ContextMenuPoint {
  x: number;
  y: number;
}


/** What was pointed at, and where to open. */
export interface ContextMenuRequest extends ContextMenuPoint {
  /** The element under the pointer, or the focused one for the keyboard. */
  target: Element;
}

/** Long enough not to fire on a tap, short enough to feel like the system's own long-press. */
export const LONG_PRESS_MS = 500;
/** A finger that travels further than this is scrolling or selecting, not holding. */
const LONG_PRESS_SLOP = 10;
/** Swallows the `contextmenu` a browser fires after a long-press or a key we already handled. */
const DEDUPE_MS = 800;

/**
 * Where a keyboard-opened menu goes: under the caret when the selection is inside the target
 * (an editor), under the element otherwise.
 */
function keyboardPoint(target: Element): ContextMenuPoint {
  // Through the element's own document, never a global: this runs only with a DOM element in hand.
  const selection = target.ownerDocument.getSelection();
  if (selection && selection.rangeCount > 0 && target.contains(selection.anchorNode)) {
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width > 0 || rect.height > 0) return { x: rect.left, y: rect.bottom };
  }
  const rect = target.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
}

export interface ContextMenuTriggerHandlers {
  onContextMenu: React.MouseEventHandler;
  onKeyDown: React.KeyboardEventHandler;
  onPointerDown: React.PointerEventHandler;
  onPointerMove: React.PointerEventHandler;
  onPointerUp: React.PointerEventHandler;
  onPointerCancel: React.PointerEventHandler;
}

/**
 * The three ways a person asks for a context menu, as handlers to spread on the area that has one:
 *
 * - **Right-click.** The browser's own menu is prevented only here, inside the area.
 * - **The context-menu key and Shift+F10.** Windows and Linux fire `contextmenu` for them, with no
 *   pointer position; macOS fires nothing for Shift+F10. Both are caught on `keydown` and anchored
 *   to the caret or the element, and the `contextmenu` that may follow is swallowed.
 * - **A touch long-press.** iOS never fires `contextmenu`; Android does, and is deduplicated.
 */
export function useContextMenuTrigger(onOpen: (request: ContextMenuRequest) => void): ContextMenuTriggerHandlers {
  const open = React.useRef(onOpen);
  React.useEffect(() => {
    open.current = onOpen;
  });
  const press = React.useRef<{ x: number; y: number; target: Element; timer: ReturnType<typeof setTimeout> } | null>(null);
  const handledAt = React.useRef(0);

  const cancelPress = React.useCallback(() => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  }, []);

  React.useEffect(() => cancelPress, [cancelPress]);

  return React.useMemo<ContextMenuTriggerHandlers>(
    () => ({
      onContextMenu: (event) => {
        event.preventDefault();
        cancelPress();
        if (Date.now() - handledAt.current < DEDUPE_MS) return;
        const target = event.target as Element;
        // A keyboard-fired `contextmenu` carries no position.
        const point = event.clientX === 0 && event.clientY === 0 ? keyboardPoint(target) : { x: event.clientX, y: event.clientY };
        open.current({ ...point, target });
      },
      onKeyDown: (event) => {
        if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
        event.preventDefault();
        handledAt.current = Date.now();
        const target = event.target as Element;
        open.current({ ...keyboardPoint(target), target });
      },
      onPointerDown: (event) => {
        if (event.pointerType !== "touch") return;
        cancelPress();
        const { clientX: x, clientY: y } = event;
        const target = event.target as Element;
        press.current = {
          x,
          y,
          target,
          timer: setTimeout(() => {
            press.current = null;
            handledAt.current = Date.now();
            open.current({ x, y, target });
          }, LONG_PRESS_MS),
        };
      },
      onPointerMove: (event) => {
        const held = press.current;
        if (held && Math.hypot(event.clientX - held.x, event.clientY - held.y) > LONG_PRESS_SLOP) cancelPress();
      },
      onPointerUp: cancelPress,
      onPointerCancel: cancelPress,
    }),
    [cancelPress],
  );
}

