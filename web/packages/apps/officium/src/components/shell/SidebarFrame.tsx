"use client";

import { useRef, type ReactNode } from "react";
import { SidebarCollapseToggle, useSidebarCollapsed } from "@javadaba/ui";

import { useSidebarWidth } from "../../lib/shell/use-sidebar-width";
import { SidebarSplitter } from "./SidebarSplitter";
import { useFoldMotion } from "./use-fold-motion";

const toggleClass =
  "flex min-h-11 flex-row items-center gap-2 rounded-[var(--radius-jd-sm)] px-2 text-xs font-medium text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-[color:var(--jd-ink)]";

/** The frame's ground, folded or not: the whole height of the view, a step off the page's white. Open, the
 *  splitter draws its edge; folded, a hairline does. `officium-docs-sidebar` names it for the fold's view transition. */
const FRAME = "officium-docs-sidebar hidden shrink-0 bg-[color:var(--officium-docs-sidebar)] md:flex md:min-h-0";

/** What a sidebar frame names for itself: its region, where its fold and width are remembered per viewer, and
 *  the test ids its e2e specs read. Documentation and Configuration each pass their own (JAVA-1626). */
export type SidebarFrameKeys = {
  label: string;
  foldKey: string;
  widthKey: string;
  testIds: { frame: string; tree: string; splitter: string };
};

/**
 * A resizable, foldable sidebar for the desktop (JAVA-799, lifted from the documentation view by JAVA-1626): between
 * 208 and 480 px wide, folded away, both remembered per viewer. On a phone the same content lives in a drawer, so
 * this frame is md and up only. Folded, only the button that brings it back stays.
 *
 * It holds the whole height of the view and scrolls on its own (JAVA-1535), so the tree and the page each keep their
 * place while another scrolls; folding and unfolding move it and the page as one piece (`useFoldMotion`).
 */
export function SidebarFrame({ keys, children }: { keys: SidebarFrameKeys; children: ReactNode }) {
  const { label, foldKey, widthKey, testIds } = keys;
  const { collapsed, setCollapsed } = useSidebarCollapsed(foldKey);
  const folded = useFoldMotion(collapsed);
  const { width, setWidth, reset } = useSidebarWidth(widthKey);
  const frame = useRef<HTMLDivElement>(null);
  // One tree in both states: the toggle keeps its element (and its place, `px-2`) so its glyph and label can move
  // instead of being remounted. Only the tree and the splitter come and go with the fold.
  return (
    <div
      ref={frame}
      style={folded ? undefined : { width }}
      className={`${FRAME} relative flex-row overflow-hidden ${folded ? "border-r border-[color:var(--jd-line)]" : ""}`}
      data-testid={testIds.frame}
      data-collapsed={String(folded)}
    >
      <div className={`flex min-h-0 flex-col gap-2 px-2 py-4 ${folded ? "shrink-0" : "min-w-0 flex-1"}`}>
        <div className="flex flex-row justify-start">
          <SidebarCollapseToggle
            storageKey={foldKey}
            folded={folded}
            collapseLabel="Hide sidebar"
            expandLabel="Show sidebar"
            className={toggleClass}
          />
        </div>
        {!folded && (
          <nav aria-label={label} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-1" data-testid={testIds.tree}>
            {children}
          </nav>
        )}
      </div>
      {!folded && (
        <SidebarSplitter
          frame={frame}
          width={width}
          onWidth={setWidth}
          onReset={reset}
          onCollapse={() => setCollapsed(true)}
          testId={testIds.splitter}
        />
      )}
    </div>
  );
}
