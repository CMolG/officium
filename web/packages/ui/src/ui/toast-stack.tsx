"use client";

import * as React from "react";

import { Text } from "./text";
import { ToastAnnouncer } from "./toast-announcer";
import { useAnnouncements } from "./toast-announcements";
import { PEEK_PX, peekOf, ToastStackItems } from "./toast-stack-items";
import { ToastStrip } from "./toast-strip";
import { toastStore } from "./toast";
import type { ToastLabels } from "./toast.shared";
import type { ToastSnapshot } from "./toast-store";
import { useToastHolds } from "./use-toast-holds";

const EMPTY: ToastSnapshot = { visible: [], queued: 0 };

export interface ToastStackProps {
  labels: ToastLabels;
  /** Drawn inside an open dialog (`ToastDock`): only the count shows, never a toast over the dialog. */
  dock?: boolean;
  /** Told how many toasts are on screen now, so a page can keep clear of the stack (JAVA-1624). */
  onVisibleChange?: (count: number) => void;
  /** The edge the stack hangs from: the bottom on a page, the top (under the 32 px menu bar) on Javadaba OS. */
  corner?: "bottom" | "top";
}

/**
 * The stack itself: the newest toast in front and two peeking behind it, opening into a list on hover
 * or focus, with the hint for the queue and the holds that pause every clock at once. Owns the live
 * region, so only the claimant speaks (see `toast-owner`). Escape on a toast dismisses that toast.
 */
export function ToastStack({ labels, dock = false, onVisibleChange, corner = "bottom" }: ToastStackProps) {
  const atTop = corner === "top";
  const snapshot = React.useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => EMPTY);
  const announcements = useAnnouncements(snapshot.visible, labels);
  const root = React.useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const unfocus = React.useCallback(() => setFocused(false), []);

  React.useEffect(() => {
    onVisibleChange?.(snapshot.visible.length);
    return () => onVisibleChange?.(0);
  }, [snapshot.visible, onVisibleChange]);

  useToastHolds(root, snapshot.visible, unfocus);

  /** Escape on a toast moves focus to the next open toast, or back to the stack, never to the page body. */
  const dismissFromKeyboard = (id: string) => {
    const open = Array.from(root.current?.querySelectorAll<HTMLElement>('[data-toast-id][data-state="open"]') ?? []);
    const index = open.findIndex((element) => element.dataset.toastId === id);
    const next = open[index + 1] ?? open[index - 1];
    // A toast behind the front one is inert: the stack takes the focus, and its focus opens the list.
    const button = next?.hasAttribute("inert") ? null : next?.querySelector<HTMLElement>("[data-toast-dismiss]");
    (button ?? root.current)?.focus();
    toastStore.dismiss(id);
  };

  // Newest first: the one in front is the one just raised.
  const newest = [...snapshot.visible].reverse();
  const total = newest.length + snapshot.queued;
  const collapsed = !dock && !hovered && !focused && newest.length > 1;
  const items = (
    <ToastStackItems newest={newest} labels={labels} collapsed={collapsed} onEscape={dismissFromKeyboard} corner={corner} />
  );

  return (
    <div
      ref={root}
      tabIndex={-1}
      data-jd-floating-layer=""
      role={total > 0 ? "group" : undefined}
      aria-label={total > 0 ? labels.stack(total) : undefined}
      className={
        dock
          ? "pointer-events-none sticky bottom-0 z-10 flex w-full flex-col gap-2 outline-none"
          : // The corner stays as each surface has it (Lib-Overlays § toast.stack): bottom right on a desk, the full
            // width of the gutters on a phone. A page that must keep clear of it reads `onVisibleChange`.
            `pointer-events-none fixed inset-x-4 ${atTop ? "top-11" : "bottom-4"} z-[101] flex flex-col gap-2 outline-none sm:left-auto sm:right-4 sm:w-full sm:max-w-sm`
      }
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        setHovered(true);
        toastStore.pause("pointer", true);
      }}
      onPointerLeave={() => {
        setHovered(false);
        toastStore.pause("pointer", false);
      }}
      onFocus={() => {
        setFocused(true);
        toastStore.pause("focus", true);
      }}
      onBlur={(event) => {
        if (root.current?.contains(event.relatedTarget as Node | null)) return;
        setFocused(false);
        toastStore.pause("focus", false);
      }}
    >
      <ToastAnnouncer announcements={announcements} label={labels.region} />
      {snapshot.queued > 0 && !dock && (
        <Text as="p" size="sm" tone="muted" className="self-end rounded-md bg-[color:var(--jd-raised)] px-2 py-1">
          {labels.waiting(snapshot.queued)}
        </Text>
      )}
      {dock ? (
        total > 0 && (
          <ToastStrip labels={labels} count={total}>
            {items}
          </ToastStrip>
        )
      ) : (
        // The same box open and closed: a toast that holds the focus is not remounted when the stack opens around it.
        <div
          className={collapsed ? "relative w-full" : "flex w-full flex-col gap-2"}
          style={collapsed ? { height: 44 + peekOf(newest.length) * PEEK_PX } : undefined}
        >
          {items}
        </div>
      )}
      {!dock && !collapsed && newest.length > 1 && (
        <button
          type="button"
          onClick={() => toastStore.dismiss()}
          className="pointer-events-auto min-h-11 cursor-pointer self-end rounded-lg px-2 text-[13px] font-semibold text-[color:var(--jd-ink)] underline underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-focus)]"
        >
          {labels.dismissAll}
        </button>
      )}
    </div>
  );
}
