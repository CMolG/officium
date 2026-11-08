"use client";

import { useCallback, useEffect, useState } from "react";

export type LazyState<T> = { status: "loading"; value: undefined } | { status: "ready"; value: T } | { status: "failed"; value: undefined };

/**
 * Runs one lazy loader (a module-level function over a cached promise, so it is stable) and reports it as
 * loading, ready or failed. `retry` runs it again; a failed loader has already dropped its cache entry.
 */
export function useLazy<T>(load: () => Promise<T>): LazyState<T> & { retry: () => void } {
  const [state, setState] = useState<LazyState<T>>({ status: "loading", value: undefined });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    load().then(
      (value) => live && setState({ status: "ready", value }),
      () => live && setState({ status: "failed", value: undefined }),
    );
    return () => {
      live = false;
    };
  }, [load, attempt]);

  const retry = useCallback(() => {
    setState({ status: "loading", value: undefined });
    setAttempt((count) => count + 1);
  }, []);

  return { ...state, retry };
}
