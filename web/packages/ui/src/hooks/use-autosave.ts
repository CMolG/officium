"use client";

import { onConnectivityChange } from "@javadaba/sdk/platform";
import { useEffect, useState } from "react";
import { AutosaveController, type AutosaveFailure, type AutosaveState } from "./autosave";

export interface UseAutosaveOptions<T> {
  /** Writes one value. Rejecting with a `TypeError` (no network) retries; anything else waits for `retry()`. */
  save: (value: T) => Promise<void>;
  /** The pause after the last change, in ms. */
  delay?: number;
  /** While false, changes are kept and nothing is sent. */
  enabled?: boolean;
  /** Overrides which failures retry by themselves (`defaultClassify`). */
  classify?: (error: unknown) => AutosaveFailure;
}

export interface Autosave<T> extends AutosaveState {
  /** Records a change, saved after the pause. */
  schedule: (value: T) => void;
  /** Saves the pending change now. */
  flush: () => Promise<void>;
  /** Sends the latest change again after a failure. */
  retry: () => Promise<void>;
  /** Forgets the pending change: the person chose to drop it. */
  discard: () => void;
  /** Something the person changed is not saved yet: pending, saving, offline or failed. */
  unsaved: boolean;
}

/**
 * Saves a value after a pause in the editing, one save at a time, and says how it went (JAVA-796).
 * Unmounting saves a pending change instead of dropping it; coming back online sends what the
 * network held up. The rules live in {@link AutosaveController}.
 */
export function useAutosave<T>({ save, delay = 1_000, enabled = true, classify }: UseAutosaveOptions<T>): Autosave<T> {
  const [state, setState] = useState<AutosaveState>({ status: "idle", error: null });
  // The controller and its actions are made once, so a caller can list them as effect dependencies.
  const [{ controller, actions }] = useState(() => {
    const made = new AutosaveController<T>({ save, delay, classify, onStateChange: setState });
    return {
      controller: made,
      actions: {
        schedule: (value: T) => made.schedule(value),
        flush: () => made.flush(),
        retry: () => made.retry(),
        discard: () => made.discard(),
      },
    };
  });

  useEffect(() => {
    controller.update({ save, delay, classify, onStateChange: setState });
  });
  useEffect(() => controller.setEnabled(enabled), [controller, enabled]);
  useEffect(() => onConnectivityChange((online) => online && controller.reconnected()), [controller]);
  useEffect(() => {
    controller.attach();
    return () => controller.dispose();
  }, [controller]);

  return { ...state, ...actions, unsaved: state.status !== "idle" && state.status !== "saved" };
}
