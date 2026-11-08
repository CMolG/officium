"use client";

import { useEffect, type ReactNode } from "react";
import { useTheater } from "../hooks/useTheater";

/** While the active scene is loading, the clock does not run: the scene starts when there is something to see. */
export function LoadingHold({ children }: { children: ReactNode }) {
  const { hold, release } = useTheater();
  useEffect(() => {
    hold("loading");
    return () => release("loading");
  }, [hold, release]);
  return <>{children}</>;
}
