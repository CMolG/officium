'use client';

// packages/ui/src/canvas/chrome/CanvasMinimap.tsx
//
// The minimap HUD widget (Lib-Canvas "HUD"): every item as a small block, the window the person is
// looking through as an outlined frame, and a click anywhere centers the field there. It is the body
// of `minimapWidget()`, which the HUD layer frames, drags and resizes like any other widget. A
// pointer aid only: the components panel is how a keyboard reaches an item, so it is hidden from
// assistive technology.

import type { MouseEvent } from 'react';
import { centerOn } from '../core/camera';
import { minimapLayout, minimapToWorld, visibleWorld } from '../core/minimap';
import type { Size } from '../core/types';
import { useCamera, useEngine, useEngineSelector } from '../react/hooks';
import { useDabaCanvasContext } from '../react/DabaCanvas';

/** The drawing's own coordinate space; the SVG scales to its widget. */
const BOX: Size = { width: 192, height: 120 };

export function CanvasMinimap() {
  const engine = useEngine();
  const camera = useCamera();
  const items = useEngineSelector((state) => state.items);
  const { containerRef } = useDabaCanvasContext();

  const rect = containerRef.current?.getBoundingClientRect();
  const viewport: Size = { width: rect?.width || 0, height: rect?.height || 0 };
  const layout = minimapLayout(
    Object.values(items).map((item) => ({
      id: item.id,
      rect: { x: item.position.x, y: item.position.y, width: item.size.width, height: item.size.height },
    })),
    visibleWorld(camera, viewport),
    BOX,
  );

  const center = (event: MouseEvent<SVGSVGElement>) => {
    const svg = event.currentTarget;
    const matrix = svg.getScreenCTM();
    if (!matrix || viewport.width === 0) return;
    const at = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const world = minimapToWorld({ x: at.x, y: at.y }, layout);
    const pan = centerOn({ x: world.x, y: world.y, width: 0, height: 0 }, viewport, camera.zoom);
    engine.setState({ camera: { pan, zoom: camera.zoom } });
  };

  return (
    <svg
      className="daba-minimap"
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      onClick={center}
    >
      {layout.items.map(({ id, rect: r }) => (
        <rect key={id} className="daba-minimap__item" x={r.x} y={r.y} width={Math.max(2, r.width)} height={Math.max(2, r.height)} rx={1.5} />
      ))}
      <rect className="daba-minimap__view" x={layout.view.x} y={layout.view.y} width={layout.view.width} height={layout.view.height} rx={2} />
    </svg>
  );
}
