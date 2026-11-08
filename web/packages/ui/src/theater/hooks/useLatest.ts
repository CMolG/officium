"use client";

import { useRef } from "react";
import { useIsoLayoutEffect } from "./useIsoLayoutEffect";

/**
 * A ref that always holds the value of the last render. Callers name the result `…Ref`: the
 * React Compiler recognizes a ref by its name, and only then lets a memoized callback read
 * `.current` without listing it as a dependency.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useIsoLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
