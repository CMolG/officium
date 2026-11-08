"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { useBottomReserve } from "../hooks/use-bottom-reserve";
import { useSurfaceThird } from "../hooks/use-surface-third";
import { cn } from "../lib/cn";
import { useTheaterScene } from "../theater/Theater";
import { FloatingTrayPill } from "./floating-tray-pill";
import { FloatingTrayToggle } from "./floating-tray-toggle";
import { Panel } from "./panel";

/*
 * FloatingTray — a raised strip docked at the bottom of a surface: a header that summarises and a
 * body that expands (JAVA-119, first used by Officium's agent-work list).
 *
 * It floats OVER its container (the parent writes `relative`), never taking height from it, and
 * reports how much of the bottom it covers (`onInsetChange`) so the container can pad its scroll
 * areas. A container that grows with its content instead of scrolling inside itself -- a phone
 * layout whose page is the scroller -- would carry the tray down to the end of that content, so
 * `dock="screen-below-lg"` pins it to the screen's bottom below `lg` (JAVA-223), and
 * `dock="screen-below-md"` below `md`, for a surface whose layout switches there (JAVA-422). A
 * screen dock rises above the analytics consent bar (except inside a Theater scene, where that bar
 * is drawn outside the frame); a container dock does not, because the bar already pads the body
 * and the container ends above it (JAVA-1561). `open={false}` renders nothing: an empty tray is
 * not shown.
 *
 * Collapsed it is a pill (Lib-Chrome): one raised button with the summary and a chevron, so a closed tray
 * costs one line, not a header over a hidden list. Expanded it is the panel: a header that names the
 * work, then the list. The pill is a real button (aria-expanded), and the list is not in the tree while
 * collapsed.
 */

export interface FloatingTrayProps {
  /** Whether there is anything to show. False renders nothing. */
  open: boolean;
  /** The live region's accessible name. */
  label: string;
  icon?: ReactNode;
  /** The header while expanded. */
  title: ReactNode;
  /** The header while collapsed: the summary. Defaults to `title`. */
  collapsedTitle?: ReactNode;
  /** Start collapsed, for a surface where the summary is the point and the list is on demand. */
  defaultCollapsed?: boolean;
  /** Controlled collapse, for a surface that remembers the viewer's choice. Wins over defaultCollapsed. */
  collapsed?: boolean;
  /** Called with the next collapsed state when the viewer toggles the tray. */
  onCollapsedChange?: (collapsed: boolean) => void;
  expandLabel?: string;
  collapseLabel?: string;
  /** The height (px) the tray covers at the bottom of its container, 0 when not shown. */
  onInsetChange?: (px: number) => void;
  /** `data-theater-target` for the toggle, so a scene's ghost cursor can reach it. */
  toggleTarget?: string;
  /** Small actions of the surface (Officium's Pop out): in the header while expanded, beside the pill while collapsed. */
  actions?: ReactNode;
  /** What the tray docks to: its container's bottom (the default), or, below `lg` or `md`, the
   *  screen's -- for a container that grows with its content on a phone instead of scrolling inside
   *  itself. Pick the breakpoint where the container stops being bounded. */
  dock?: "container" | "screen-below-lg" | "screen-below-md";
  className?: string;
  children?: ReactNode;
}

const GAP = 16;

// The consent-bar lift is a margin on a screen dock only: a fixed box's margin moves it up, while an
// absolute one already sits inside a container that ends above the bar.
const DOCK_CLASS: Record<NonNullable<FloatingTrayProps["dock"]>, string> = {
  container: "absolute",
  "screen-below-lg": "fixed mb-[var(--jd-tray-lift)] lg:absolute lg:mb-0",
  "screen-below-md": "fixed mb-[var(--jd-tray-lift)] md:absolute md:mb-0",
};

export function FloatingTray({
  open,
  label,
  icon,
  title,
  collapsedTitle,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  expandLabel = "Expand",
  collapseLabel = "Collapse",
  onInsetChange,
  toggleTarget,
  actions,
  dock = "container",
  className,
  children,
}: FloatingTrayProps) {
  const [ownCollapsed, setOwnCollapsed] = useState(defaultCollapsed);
  const collapsed = controlledCollapsed ?? ownCollapsed;
  const root = useRef<HTMLDivElement>(null);
  const inTheater = useTheaterScene() !== null;
  const reserved = useBottomReserve(open && !inTheater);
  const pane = useRef<HTMLDivElement>(null);
  // The expanded body never covers more than a third of the surface it floats over (JAVA-1547): its
  // list scrolls inside instead of eating the columns. Its height moves with the surface, so the
  // measure below follows it (JAVA-1561).
  const bodyMax = useSurfaceThird(root, open);

  // Layout effect: the container gets its inset in the SAME frame the tray first paints, or its
  // columns jump after they are already on screen.
  useLayoutEffect(() => {
    const paneNode = pane.current;
    if (!open || !paneNode) {
      onInsetChange?.(0);
      return;
    }
    const report = () => onInsetChange?.(paneNode.offsetHeight + 2 * GAP);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(paneNode);
    return () => {
      observer.disconnect();
      onInsetChange?.(0);
    };
  }, [open, collapsed, bodyMax, onInsetChange]);

  const toggle = () => {
    const next = !collapsed;
    setOwnCollapsed(next);
    onCollapsedChange?.(next);
  };

  if (!open) return null;

  return (
    <div
      ref={root}
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "pointer-events-none inset-x-0 z-40 flex flex-row justify-center px-4",
        DOCK_CLASS[dock],
      )}
      style={{ bottom: GAP, ["--jd-tray-lift" as string]: `${reserved}px` }}
    >
      <div ref={pane} data-slot="floating-tray-pane" className={cn("flex w-full max-w-md flex-col items-center", className)}>
        {collapsed ? (
          <div className="pointer-events-none flex flex-row items-center gap-2">
            <FloatingTrayPill
              icon={icon}
              summary={collapsedTitle ?? title}
              expandLabel={expandLabel}
              onToggle={toggle}
              target={toggleTarget}
            />
            {actions && <div className="pointer-events-auto flex flex-row items-center">{actions}</div>}
          </div>
        ) : (
          <Panel
            material="raised"
            radius="lg"
            // The tray is raised: white with a hairline edge, not a veil over the page (Lib-Chrome).
            className="pointer-events-auto flex w-full flex-col overflow-hidden animate-jd-sheet-in motion-reduce:animate-none border border-[color:var(--jd-line)]"
          >
            <div className="flex flex-row items-center gap-2 px-4 py-2.5">
              {icon}
              <p className="min-w-0 flex-1 text-pretty text-sm font-semibold text-[color:var(--jd-ink)]">{title}</p>
              {actions}
              <FloatingTrayToggle
                collapsed={false}
                expandLabel={expandLabel}
                collapseLabel={collapseLabel}
                onToggle={toggle}
                target={toggleTarget}
              />
            </div>
            <div
              className="flex flex-col overflow-y-auto overscroll-contain border-t border-[color:var(--jd-line)]"
              style={{ maxHeight: bodyMax }}
            >
              {children}
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
