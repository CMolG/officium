import * as React from "react";

import { surfaceOf, type SurfaceStamp } from "./surface-stamp";

/**
 * The surface of whatever had focus when a layer opened (the same stamp `DialogContent` takes), read once on the first
 * render: a portal hangs off `<body>`, outside every surface, and wears the opener's so its tokens exist.
 */
export function useOpenerStamp(): SurfaceStamp {
  const [stamp] = React.useState(() =>
    surfaceOf(typeof document === "undefined" ? null : ((document.activeElement as HTMLElement | null) ?? document.body)),
  );
  return stamp;
}

/** True when focus is somewhere inside `container`: a layer drawn inside a frame must not steal focus from the page around it. */
export function focusIsWithin(container: HTMLElement): boolean {
  return container.contains(document.activeElement);
}
