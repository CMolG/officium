'use client';

// packages/ui/src/canvas/chrome/DockPopover.tsx
//
// Port of the `DockPopover.tsx` shell (Fluxor, ~57 LOC): a floating
// popover anchored over a Dock item, closes on click-outside/Escape. The
// content is decided by the consumer (`DockItemSpec.popover`).
//
// `Dock` renders this NESTED inside the item's button (not as a loose
// sibling of the bar): that way the popover positions itself (CSS
// `position: absolute`) relative to ITS item, not to the whole dock, and
// moving from the button into the popover's content does not fire
// `pointerleave` on the button (enter/leave events are computed by node
// ancestry, not by geometry) — that is what makes `popoverOpenOn: 'hover'`
// possible. Two consequences of being nested inside an interactive
// element:
//
// 1. The "click outside closes" listener runs in the BUBBLE phase, not
//    CAPTURE — same as Fluxor's real `DockPopover.tsx` (unlike the one
//    here until now). The triggering button is technically "outside" the
//    popover's own div, so a second click on it (to close it) ALWAYS
//    makes this listener also see it as "outside" and call `onClose`
//    —that happens the same whether it is capture or bubble, the phase
//    order alone does not prevent it—. What actually prevents the
//    reopen is that `Dock` decides its toggle with a snapshot
//    (`PressState.popoverWasOpen`) taken on `pointerdown`, instead of
//    rereading the state on `pointerup`; bubble here simply matches
//    Fluxor's event order and keeps this listener from acting BEFORE
//    React registers the press itself.
// 2. pointerdown/pointerup/click events INSIDE the popover must not keep
//    bubbling up to the containing button (which has its own
//    click/drag-out handlers) — they are stopped here, same as Fluxor's
//    original does.
import { useEffect, useRef, type ReactNode } from 'react';

export interface DockPopoverProps {
  children?: ReactNode;
  onClose(): void;
  className?: string;
  /** `aria-label` for the `role="dialog"` div (default: no aria-label, no change from previous behavior). */
  ariaLabel?: string;
}

export function DockPopover({ children, onClose, className, ariaLabel }: DockPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={['daba-dock-popover', className].filter(Boolean).join(' ')}
      role="dialog"
      aria-label={ariaLabel}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}
