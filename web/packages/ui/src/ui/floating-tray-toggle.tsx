"use client";

import { cn } from "../lib/cn";
import { Button } from "./button";

/** FloatingTray's expand/collapse button: a chevron that turns over by transform. */
export function FloatingTrayToggle({
  collapsed,
  expandLabel,
  collapseLabel,
  onToggle,
  target,
}: {
  collapsed: boolean;
  expandLabel: string;
  collapseLabel: string;
  onToggle: () => void;
  /** `data-theater-target`, so a scene's ghost cursor can reach it. */
  target?: string;
}) {
  return (
    <Button
      type="button"
      register="ui"
      variant="ghost"
      size="icon"
      aria-expanded={!collapsed}
      aria-label={collapsed ? expandLabel : collapseLabel}
      onClick={onToggle}
      data-theater-target={target}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={cn(
          "transition-transform duration-[var(--jd-dur-slow)] ease-[var(--ease-jd)]",
          collapsed && "rotate-180",
        )}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </Button>
  );
}
