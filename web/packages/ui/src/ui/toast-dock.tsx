"use client";

import * as React from "react";

import { toastStore } from "./toast";
import { claimToastOwner, currentToastOwner, pageToastLabels, releaseToastOwner, subscribeToastOwners } from "./toast-owner";
import { ToastStack } from "./toast-stack";
import type { ToastSnapshot } from "./toast-store";

const EMPTY: ToastSnapshot = { visible: [], queued: 0 };

/**
 * The toast stack drawn inside an open modal `Dialog`, as its last child (JAVA-1620). The dialog's focus
 * trap covers it, so a toast's action and dismiss are reachable by Tab and Escape over the dialog. It
 * takes the stack from the page while the dialog is open, and hands it back on close. Nothing renders
 * while there are no toasts, so a dialog with none keeps its layout.
 */
export function ToastDock() {
  const token = React.useRef({}).current;
  const top = React.useSyncExternalStore(subscribeToastOwners, currentToastOwner, () => null);
  const snapshot = React.useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => EMPTY);
  const labels = React.useSyncExternalStore(subscribeToastOwners, pageToastLabels, pageToastLabels);

  React.useEffect(() => {
    claimToastOwner(token, "dialog", pageToastLabels());
    return () => releaseToastOwner(token);
  }, [token]);

  if (top?.token !== token || (snapshot.visible.length === 0 && snapshot.queued === 0)) return null;
  return <ToastStack labels={labels} dock />;
}
