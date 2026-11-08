import type { SurfaceStamp } from "./surface-stamp";

/** Android has one surface and no portals hung off <body>: no stamp to take. */
export function useOpenerStamp(): SurfaceStamp {
  return { className: "" };
}

export function focusIsWithin(): boolean {
  return true;
}
