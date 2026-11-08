'use client';

// packages/ui/src/canvas/chrome/minimap-widget.tsx
//
// The minimap as a HUD widget (Lib-Canvas "HUD"): hand it to `HudLayer` and `HudLauncher` with the
// app's other widgets. The app owns whether it is visible and where it sits, as for every widget.

import { CanvasMinimap } from './CanvasMinimap';
import type { HudWidgetSpec } from './HudLayer';

export const MINIMAP_WIDGET_TYPE = 'minimap';

const ICON = (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <rect x="12" y="10" width="6" height="6" rx="1" />
    <path d="M6 8h3M6 12h3" />
  </svg>
);

export function minimapWidget(title = 'Minimap'): HudWidgetSpec {
  return {
    type: MINIMAP_WIDGET_TYPE,
    title,
    icon: ICON,
    defaultSize: { width: 240, height: 168 },
    render: () => <CanvasMinimap />,
  };
}
