"use client";

import * as React from "react";

/**
 * Where the system's floating layers —`Dialog`, `Select`'s listbox, `Popover`— portal to.
 * `null`, the default, means `document.body`, which is what every app surface wants.
 *
 * A player that draws a miniapp inside a scaled frame (`Theater`) provides its own node
 * instead, so a modal the miniapp opens stays INSIDE the frame —scaled and clipped with
 * it— rather than covering the whole page hosting it (user report, 2026-09-15: the Officium
 * board's card modal opened full-screen over the product page).
 *
 * The node must be a containing block for `position: fixed` (a transform or
 * `contain: layout` does it): the layers keep their `fixed inset-0` geometry and it resolves
 * against the frame instead of the viewport.
 *
 * Inside a container the layers also stop being MODAL towards the page: a scroll lock or a
 * `pointer-events: none` on `<body>` would freeze the host page for a dialog the viewer may
 * not even be looking at. See `DialogContent`.
 */
const PortalContainerContext = React.createContext<HTMLElement | null>(null);

export const PortalContainerProvider = PortalContainerContext.Provider;

export function usePortalContainer(): HTMLElement | null {
  return React.useContext(PortalContainerContext);
}
