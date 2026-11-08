export const DABA_ENGINE_VERSION = '0.3.0';

// ── core/ (logica pura, sin React) ──────────────────────────────────────────
export * from './core/types';
export * from './core/grid';
export * from './core/snap';
export * from './core/snap-guides';
export * from './core/camera';
export * from './core/selection';
export * from './core/z-order';
export * from './core/hud-grid';
export * from './core/minimap';
export * from './core/touch';
export * from './core/storage';
export * from './core/store';

// ── react/ ───────────────────────────────────────────────────────────────
export * from './react/EngineProvider';
export * from './react/hooks';
export * from './react/DabaCanvas';
export * from './react/CanvasItem';
export * from './react/DottedBackground';
export * from './react/SnapGuidesOverlay';
export * from './react/useTouch';

// ── chrome/ ──────────────────────────────────────────────────────────────
export * from './chrome/Dock';
export * from './chrome/DockPopover';
export * from './chrome/HudLayer';
export * from './chrome/HudLauncher';
export * from './chrome/CanvasMinimap';
export * from './chrome/minimap-widget';
export * from './chrome/ComponentsPanel';
export * from './chrome/SideToolbar';
export * from './chrome/InspectorSheet';
export * from './chrome/PanelFoldButton';
export * from './react/usePanelOpen';
export * from './chrome/TouchDock';
export * from './chrome/TouchStatus';
export * from './chrome/TouchSelection';
