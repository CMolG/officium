'use client';

// packages/ui/src/canvas/chrome/TouchDock.tsx
//
// The dock on a touch screen (Lib-Canvas "Touch", JAVA-1497): Pan, Select by box, Zoom out, Zoom in
// and Undo, 44 px each. Pan is the touch default and shows pressed. Drawing a box to select is a
// mode of its own, switched on here, so a drag never selects by accident. It goes in the
// canvas's `overlay`. There is no hover on touch: every tool names itself on a long press, which the
// shared Tooltip does (and the accessible name carries for everyone else).

import type { ReactNode } from 'react';
import { Tooltip } from '../../ui/tooltip';
import { zoomStep } from '../core/touch';
import { useEngine } from '../react/hooks';
import { useDabaCanvasContext } from '../react/DabaCanvas';
import { useTouch } from '../react/useTouch';

const ZOOM_FACTOR = 1.25;

export interface TouchDockLabels {
  tools: string;
  pan: string;
  select: string;
  zoomOut: string;
  zoomIn: string;
  undo: string;
}

export const TOUCH_DOCK_LABELS_EN: TouchDockLabels = {
  tools: 'Canvas tools',
  pan: 'Pan',
  select: 'Select by box',
  zoomOut: 'Zoom out',
  zoomIn: 'Zoom in',
  undo: 'Undo',
};

export interface TouchDockProps {
  /** Shown only when given: the engine keeps no history, the app does. */
  onUndo?: () => void;
  undoDisabled?: boolean;
  labels?: Partial<TouchDockLabels>;
  className?: string;
}

/** A Lucide stroke at the dock's size (a function, not a component: the dock is the one component here). */
function glyph(children: ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const PAN = glyph(
  <>
    <path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.7-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15" />
  </>,
);
const SELECT = glyph(
  <path d="M5 3a2 2 0 0 0-2 2M19 3a2 2 0 0 1 2 2M21 19a2 2 0 0 1-2 2M5 21a2 2 0 0 1-2-2M9 3h1M9 21h1M14 3h1M14 21h1M3 9v1M21 9v1M3 14v1M21 14v1" />,
);
const ZOOM_OUT = glyph(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3M8 11h6" />
  </>,
);
const ZOOM_IN = glyph(
  <>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3M8 11h6M11 8v6" />
  </>,
);
const UNDO = glyph(
  <>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  </>,
);

interface Tool {
  id: string;
  label: string;
  icon: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  run: () => void;
}

export function TouchDock({ onUndo, undoDisabled = false, labels, className }: TouchDockProps) {
  const words = { ...TOUCH_DOCK_LABELS_EN, ...labels };
  const engine = useEngine();
  const { containerRef } = useDabaCanvasContext();
  const { mode, setMode } = useTouch();

  const zoomBy = (factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const center = rect ? { x: rect.width / 2, y: rect.height / 2 } : { x: 0, y: 0 };
    engine.setState({ camera: zoomStep(engine.getState().camera, center, factor) });
  };

  const tools: Tool[] = [
    { id: 'pan', label: words.pan, icon: PAN, pressed: mode === 'pan', run: () => setMode('pan') },
    { id: 'select', label: words.select, icon: SELECT, pressed: mode === 'select', run: () => setMode('select') },
    { id: 'zoom-out', label: words.zoomOut, icon: ZOOM_OUT, run: () => zoomBy(1 / ZOOM_FACTOR) },
    { id: 'zoom-in', label: words.zoomIn, icon: ZOOM_IN, run: () => zoomBy(ZOOM_FACTOR) },
    ...(onUndo ? [{ id: 'undo', label: words.undo, icon: UNDO, disabled: undoDisabled, run: onUndo }] : []),
  ];

  return (
    <div className={['daba-touch-dock', className].filter(Boolean).join(' ')} role="toolbar" aria-label={words.tools}>
      {tools.map((tool) => (
        <Tooltip key={tool.id} label={tool.label}>
          <button
            type="button"
            className="daba-touch-dock__item"
            aria-label={tool.label}
            aria-pressed={tool.pressed}
            disabled={tool.disabled}
            onClick={tool.run}
          >
            {tool.icon}
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
