"use client";

import { useRef, type RefObject } from "react";

import { SIDEBAR_MAX, SIDEBAR_MIN, stepSidebarWidth } from "../../lib/shell/use-sidebar-width";

/**
 * The handle between the sidebar and the page (JAVA-799): the WAI-ARIA window splitter. Drag it, or focus it
 * and use the arrows (16 px, Shift for 64), Home and End; Enter collapses the sidebar and a double click
 * puts the width back. Layout floor L3 deviation, declared: the 8 px strip is a desktop pointer's handle,
 * the keyboard and the 44 px collapse button cover everyone else, and the phone has a drawer instead.
 */
export function SidebarSplitter({
  frame,
  width,
  onWidth,
  onReset,
  onCollapse,
  testId,
}: {
  frame: RefObject<HTMLElement | null>;
  width: number;
  onWidth: (width: number) => void;
  onReset: () => void;
  onCollapse: () => void;
  testId: string;
}) {
  const dragging = useRef(false);
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the sidebar"
      aria-valuemin={SIDEBAR_MIN}
      aria-valuemax={SIDEBAR_MAX}
      aria-valuenow={width}
      tabIndex={0}
      data-testid={testId}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragging.current = true;
      }}
      onPointerMove={(event) => {
        if (dragging.current && frame.current) onWidth(event.clientX - frame.current.getBoundingClientRect().left);
      }}
      onPointerUp={(event) => {
        dragging.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onLostPointerCapture={() => {
        dragging.current = false;
      }}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCollapse();
          return;
        }
        const next = stepSidebarWidth(width, event.key, event.shiftKey);
        if (next !== null) {
          event.preventDefault();
          onWidth(next);
        }
      }}
      className="group relative w-2 shrink-0 cursor-col-resize touch-none outline-none"
    >
      <span className="absolute inset-y-0 left-1/2 w-px bg-[color:var(--jd-line)] transition-colors group-hover:bg-[color:var(--jd-ink)]/40 group-focus-visible:w-0.5 group-focus-visible:bg-[color:var(--jd-ink)]" />
    </div>
  );
}
