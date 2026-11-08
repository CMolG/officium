'use client';

// packages/ui/src/canvas/react/SnapGuidesOverlay.tsx
//
// Port of `SnapGuides.tsx` (Fluxor, ~36 LOC): reads the active guides from the store
// (`state.activeGuides`, written by CanvasItem during the drag — see core/store.ts) and draws them
// as lines in screen space. Rendered as `<DabaCanvas>`'s `overlay` (screen-space, not transformed
// by the pan-layer).

import { worldToScreen } from '../core/camera';
import { useCamera, useEngineSelector } from './hooks';

export interface SnapGuidesOverlayProps {
  className?: string;
}

export function SnapGuidesOverlay({ className }: SnapGuidesOverlayProps) {
  const guides = useEngineSelector((state) => state.activeGuides);
  const camera = useCamera();

  if (guides.length === 0) return null;

  return (
    <svg
      className={['daba-snap-guides-overlay', className].filter(Boolean).join(' ')}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', width: '100%', height: '100%' }}
    >
      {guides.map((guide, index) => {
        const fromWorld = guide.orientation === 'vertical' ? { x: guide.position, y: guide.from } : { x: guide.from, y: guide.position };
        const toWorldPoint = guide.orientation === 'vertical' ? { x: guide.position, y: guide.to } : { x: guide.to, y: guide.position };
        const from = worldToScreen(fromWorld, camera, { x: 0, y: 0 });
        const to = worldToScreen(toWorldPoint, camera, { x: 0, y: 0 });
        return <line key={index} className="daba-snap-guide" x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
      })}
    </svg>
  );
}
