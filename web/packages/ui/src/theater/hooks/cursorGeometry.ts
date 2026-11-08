export interface CursorPosition {
  x: number;
  y: number;
  cycle: number;
  press: number;
}

/** The layer that is playing now: the cursor works inside it, never over the one fading out. */
export function activeLayer(stage: HTMLElement | null) {
  return (
    stage?.querySelector<HTMLElement>('.theater__layer[data-state="active"]') ??
    null
  );
}

/** Center of `el` in % of the layer, or null if the layer has no box yet. */
export function centerIn(
  layer: HTMLElement,
  el: HTMLElement,
): { x: number; y: number } | null {
  const r = el.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  if (!l.width || !l.height) return null;
  return {
    x: ((r.left + r.width / 2 - l.left) / l.width) * 100,
    y: ((r.top + r.height / 2 - l.top) / l.height) * 100,
  };
}
