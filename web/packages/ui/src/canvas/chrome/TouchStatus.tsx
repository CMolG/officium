'use client';

// packages/ui/src/canvas/chrome/TouchStatus.tsx
//
// The top of a touch canvas (Lib-Canvas "Touch"): a chip that says what the fingers are doing
// ("Moving the field", "Zooming around your fingers") with the zoom level beside it, and in select
// mode an ink bar that names the mode and ends it. It goes in the canvas's `overlay`, and says
// nothing while the fingers are still (the zoom level stays, quiet, so it is always at hand).

import { useCamera } from '../react/hooks';
import { useTouch } from '../react/useTouch';

export interface TouchStatusLabels {
  moving: string;
  zooming: string;
  selectMode: string;
  done: string;
}

export const TOUCH_STATUS_LABELS_EN: TouchStatusLabels = {
  moving: 'Moving the field',
  zooming: 'Zooming around your fingers',
  selectMode: 'Select mode: drag to draw a box',
  done: 'Done',
};

export interface TouchStatusProps {
  labels?: Partial<TouchStatusLabels>;
}

export function TouchStatus({ labels }: TouchStatusProps) {
  const words = { ...TOUCH_STATUS_LABELS_EN, ...labels };
  const { mode, gesture, setMode } = useTouch();
  const { zoom } = useCamera();

  if (mode === 'select') {
    return (
      <div className="daba-touch-top">
        <div className="daba-touch-bar" role="status">
          <span>{words.selectMode}</span>
          <button type="button" onClick={() => setMode('pan')}>
            {words.done}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="daba-touch-top">
      {gesture === 'idle' ? (
        <span />
      ) : (
        <span className="daba-touch-chip" role="status">
          {gesture === 'pan' ? words.moving : words.zooming}
        </span>
      )}
      <span className="daba-touch-chip">{Math.round(zoom * 100)}%</span>
    </div>
  );
}
