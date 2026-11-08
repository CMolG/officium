"use client";

import { createContext, useContext } from "react";
import type { TheaterContextValue, TheaterSceneInfo } from "../types";

export const TheaterContext = createContext<TheaterContextValue | null>(null);
export const SceneContext = createContext<TheaterSceneInfo | null>(null);

export function useTheater(): TheaterContextValue {
  const ctx = useContext(TheaterContext);
  if (!ctx) throw new Error("useTheater() must be used inside <Theater.Root>.");
  return ctx;
}

export function useTheaterScene(): TheaterSceneInfo | null {
  return useContext(SceneContext);
}
