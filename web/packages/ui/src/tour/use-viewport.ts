"use client";

import { useEffect, useState } from "react";

import type { Size } from "./placement";

/** The window's inner size, following resizes. Zero before mount (the server and the first paint). */
export function useViewport(): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const read = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return size;
}
