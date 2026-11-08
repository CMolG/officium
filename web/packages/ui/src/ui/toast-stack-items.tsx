"use client";

import { ToastItem } from "./toast-item";
import { toastStore } from "./toast";
import type { ToastLabels } from "./toast.shared";
import type { ToastItem as Item } from "./toast-store";

/** How far each toast behind the front one peeks out, and how much it shrinks and fades (Lib-Overlays § toast.stack). */
export const PEEK_PX = 8;
const BEHIND = [
  { scale: 1, opacity: 1 },
  { scale: 0.95, opacity: 0.7 },
  { scale: 0.9, opacity: 0.4 },
] as const;

/** How many toasts show behind the front one when the stack is closed. */
export const peekOf = (count: number) => Math.min(count - 1, BEHIND.length - 1);

export interface ToastStackItemsProps {
  /** Newest first: the one in front is the one just raised. */
  newest: Item[];
  labels: ToastLabels;
  /** Closed: the toasts overlap, the ones behind scaled back, faded and out of reach of assistive tech. */
  collapsed: boolean;
  onEscape: (id: string) => void;
  /** Where the stack sits: the toasts behind the front one peek out above it (bottom) or below it (top). */
  corner?: "bottom" | "top";
}

/** The toasts of the stack, closed (overlapping) or open (a list). */
export function ToastStackItems({ newest, labels, collapsed, onEscape, corner = "bottom" }: ToastStackItemsProps) {
  const peek = peekOf(newest.length);
  const atTop = corner === "top";
  return newest.map((item, index) => {
    const step = BEHIND[Math.min(index, BEHIND.length - 1)];
    const style = collapsed
      ? {
          position: "absolute" as const,
          insetInline: 0,
          top: (atTop ? Math.min(index, peek) : peek - Math.min(index, peek)) * PEEK_PX,
          scale: step.scale,
          opacity: index > peek ? 0 : step.opacity,
          zIndex: BEHIND.length - index,
          transformOrigin: atTop ? "top center" : "bottom center",
        }
      : undefined;
    return (
      <ToastItem
        key={item.id}
        item={item}
        labels={labels}
        behind={collapsed && index > 0}
        style={style}
        onDismiss={(id) => toastStore.dismiss(id)}
        onEscape={onEscape}
      />
    );
  });
}
