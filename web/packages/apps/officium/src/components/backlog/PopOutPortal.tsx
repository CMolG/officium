"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import type { PoppedOut } from "../../lib/shell/pop-out";

/** Draws `children` inside the pop-out window while keeping the page's React state (web half of a `.native` pair). */
export function PopOutPortal({ popped, children }: { popped: PoppedOut; children: ReactNode }) {
  return createPortal(children, popped.root);
}
