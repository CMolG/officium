"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { portalRoot } from "@javadaba/sdk/platform";

import { usePortalContainer } from "../lib/portal-container";
import { ToastStack } from "./toast-stack";
import {
  claimToastOwner,
  currentToastOwner,
  pageToastHolder,
  releaseToastOwner,
  setToastOwnerLabels,
  subscribeToastOwners,
} from "./toast-owner";
import { DEFAULT_TOAST_LABELS, type ToastLabels } from "./toast.shared";

export interface ToastViewportProps {
  /** Partial overrides of the English defaults (`DEFAULT_TOAST_LABELS`). */
  labels?: Partial<ToastLabels>;
  /** Told how many toasts are on screen as the stack changes, and 0 when it leaves the page. */
  onVisibleChange?: (count: number) => void;
  /** The edge the stack hangs from. Javadaba OS passes "top" (top right, OS-Notifications); a page keeps the bottom. */
  corner?: "bottom" | "top";
}

/**
 * Mounts once per page, as a direct child of the app root (or inside `JavadabaMenu`). The toasts live in
 * one module-level store, so only one viewport draws them: the first mounted holds the page, and a later
 * one renders nothing until the holder unmounts, then takes the page over (JAVA-1620, D9). While a modal
 * `Dialog` is open it draws nothing either: the dialog draws the stack inside itself (see `toast-owner`).
 */
export function ToastViewport({ labels, onVisibleChange, corner }: ToastViewportProps) {
  const token = React.useRef({}).current;
  const container = usePortalContainer() ?? portalRoot();
  const merged = React.useMemo<ToastLabels>(() => ({ ...DEFAULT_TOAST_LABELS, ...labels }), [labels]);
  const holder = React.useSyncExternalStore(subscribeToastOwners, pageToastHolder, () => null);
  const top = React.useSyncExternalStore(subscribeToastOwners, currentToastOwner, () => null);

  // Claims the page when nobody holds it. Idempotent, so it runs again each time the holder changes.
  React.useEffect(() => {
    claimToastOwner(token, "page", merged);
  }, [token, holder, merged]);

  React.useEffect(() => {
    setToastOwnerLabels(token, merged);
  }, [token, merged]);

  React.useEffect(() => () => releaseToastOwner(token), [token]);

  if (top?.token !== token || !container) return null;
  return createPortal(<ToastStack labels={merged} onVisibleChange={onVisibleChange} corner={corner} />, container);
}
