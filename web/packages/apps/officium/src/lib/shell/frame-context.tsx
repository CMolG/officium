"use client";

import { createContext, useContext } from "react";

/**
 * Whether the app is drawn inside a desktop window. The window is the chrome there: there is no
 * product bar and no sidebar, and the window's own navigation row (`WindowRail`) carries the
 * "Projects" link and the project switcher, so the views that would repeat them leave them out.
 * Provided by the shell; false anywhere it is not mounted, the product page's Theater included.
 */
const FrameContext = createContext(false);

export const FrameProvider = FrameContext.Provider;

export function useFramed(): boolean {
  return useContext(FrameContext);
}
