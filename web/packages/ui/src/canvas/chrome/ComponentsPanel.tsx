'use client';

// packages/ui/src/canvas/chrome/ComponentsPanel.tsx
//
// The "left bar" from the request. Port of the SHELL from `NodeTree.tsx`
// + `SideBar.tsx` (Fluxor): collapsible groups, rows with icon/status,
// locate (click => camera.centerOn), edge highlight (hover =>
// setHoveredItemId => CanvasItem paints `data-daba-highlighted`,
// SYMMETRIC for ALL kinds — fixes Fluxor's asymmetry, which only had it
// for windows), optional in-place rename, per-kind context menu (a row marks
// itself with `menuTarget(kind, id)`; the surface wraps the panel in a `FeedbackMenuScope`). Node data/types
// (icon, decoration) are injected by the consumer via `renderRow`.
//
// NOTE: since `../fluxor/fluxor-ide` is out of reading scope in this run,
// this is a reconstruction from the CONTRACT the plan describes.

import { useState, type ReactNode } from 'react';
import type { EngineItem } from '../core/store';
import type { Insets, Size } from '../core/types';
import { usePanelOpen } from '../react/usePanelOpen';
import { ComponentsPanelRow } from './ComponentsPanelRow';
import { PanelFoldButton } from './PanelFoldButton';

export interface ComponentsPanelGroup {
  id: string;
  label: string;
  itemIds: string[];
}

export interface ComponentsPanelProps {
  groups: ComponentsPanelGroup[];
  /** Row domain decoration (status dots, etc.); defaults to showing the item's id. */
  renderRow?(item: EngineItem): ReactNode;
  onRename?(id: string, name: string): void;
  locateInsets?: Insets;
  /**
   * `data-testid` per row, resolved per item (the same per-item pattern
   * as Task 11's `DockItemSpec.testId` — see `chrome/Dock.tsx`).
   * Returning `undefined` for a given item omits the attribute on that
   * row. Default: no testid on any row (no change).
   */
  itemTestId?(item: EngineItem): string | undefined;
  /**
   * `aria-label` per row, resolved per item. Default: no aria-label (no
   * change).
   */
  itemAriaLabel?(item: EngineItem): string | undefined;
  /**
   * Additional CSS classes per row, ADDED to the
   * `daba-components-panel__row` base (they do not replace it) — same
   * pattern as `DockItemSpec.className`. Default: no extra class (no
   * change).
   */
  itemClassName?(item: EngineItem): string | undefined;
  /**
   * Viewport for `centerOn` on locate. Accepts a fixed `Size` (default:
   * window size, resolved the SAME way as always) or a `() => Size`
   * function — in that case it is invoked AT THE MOMENT of each locate
   * (on clicking the row), never at render. Meant for a consumer whose
   * viewport calculation depends on layout that can change between
   * renders (e.g. `window.innerWidth - 280` with a collapsible side
   * panel): reading it on click, not on mount, gives exact parity with
   * its current formula.
   */
  viewport?: Size | (() => Size);
  className?: string;
  /**
   * Invoked AFTER applying the locate's camera pan (row click), with the
   * located `EngineItem`. The engine has no domain knowledge: meant for
   * the consumer to hook its own click side-effects (Fluxor:
   * `focusWindow`, selecting the corresponding mental node) without
   * having to wrap the row. Default: no effect (nothing extra gets
   * called).
   */
  onLocate?(item: EngineItem): void;
  /**
   * Row text/seed: used as (a) the visible label when there is NO
   * `renderRow` (fallback if omitted: `item.id`, same as before) and (b)
   * the input's initial value on entering rename mode (dblclick in
   * uncontrolled mode, or when `renamingId` activates in controlled
   * mode). Default: `item.id` in both cases (no behavior change).
   */
  itemLabel?(item: EngineItem): string;
  /**
   * Turns on CONTROLLED rename mode when present (even if it is `null`
   * — what matters is that the prop gets passed, not its value): the
   * internal dblclick that used to start the rename gets fully
   * DEACTIVATED, and it is the `id` matching `renamingId` that shows the
   * input in edit mode. Omitting the prop (`undefined`, the default)
   * preserves the usual UNCONTROLLED mode: dblclick starts the rename.
   * In BOTH modes Enter and blur commit, Escape discards (parity with
   * Fluxor's real rename input, `NodeTree.tsx:462,886,1108`:
   * `onBlur={commitRename}`). See `onRenameDismiss` for the rest of
   * controlled mode's semantics.
   */
  renamingId?: string | null;
  /**
   * Only consulted in CONTROLLED mode (see `renamingId`) — in
   * uncontrolled mode the engine already has its own rename state that
   * it clears on its own, with no need to notify the consumer. Called
   * WHENEVER edit mode closes in controlled mode: after Enter or blur,
   * AFTER `onRename(id, value)` if the trimmed value is not empty (if it
   * is empty, it still gets called — closing edit mode does not depend
   * on whether there was a commit); after Escape, with no commit at all.
   * Closing edit mode is the consumer's responsibility in this mode (the
   * engine has no state of its own to clear).
   */
  onRenameDismiss?(): void;
  /**
   * `data-testid` of the rename `<input>`, resolved per item — default:
   * no testid (no change). Fluxor's e2e tests locate that input with
   * `data-testid="nav-window-rename-input-${id}"` (and analogous
   * variants for grid/mental); the engine has no knowledge of that
   * domain format, it only forwards whatever the consumer computes.
   */
  renameInputTestId?(item: EngineItem): string | undefined;
  /**
   * Content to render INSTEAD OF the groups when there is nothing to
   * list (`groups` empty, or all of its `itemIds` empty). Default
   * (omitted): no change from before — the empty groups container gets
   * rendered (or the group headers with no rows), with no message at
   * all.
   */
  emptyState?: ReactNode;
  /**
   * A name for the panel ("Layers"): with it the panel gets a header with a button that folds it,
   * and folded it leaves one button where it was. Without it the panel is as it always was.
   */
  title?: string;
  /** Key under `state.chrome.panels` that remembers whether this panel is folded. Default `'componentsPanel'`. */
  panelKey?: string;
  /** The rename field's name ("Rename layer"), for a language other than English. */
  renameLabel?: string;
  /** The row's More button ("More actions for Hero image"); it draws only inside a `FeedbackContextMenu`. */
  moreLabel?(name: string): string;
}

export function ComponentsPanel({
  groups,
  renderRow,
  onRename,
  locateInsets,
  viewport,
  className,
  itemTestId,
  itemAriaLabel,
  itemClassName,
  onLocate,
  itemLabel,
  renamingId,
  onRenameDismiss,
  renameInputTestId,
  emptyState,
  title,
  panelKey = 'componentsPanel',
  renameLabel,
  moreLabel,
}: ComponentsPanelProps) {
  const [open, setOpen] = usePanelOpen(panelKey);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (id: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isEmpty = groups.length === 0 || groups.every((group) => group.itemIds.length === 0);

  if (title && !open) {
    return <PanelFoldButton name={`${title.toLowerCase()} panel`} folded onToggle={() => setOpen(true)} className="daba-panel-fold--standalone" />;
  }

  return (
    <div className={['daba-components-panel', className].filter(Boolean).join(' ')}>
      {title ? (
        <div className="daba-components-panel__header">
          <span>{title}</span>
          <PanelFoldButton name={`${title.toLowerCase()} panel`} folded={false} onToggle={() => setOpen(false)} />
        </div>
      ) : null}
      {isEmpty && emptyState
        ? emptyState
        : groups.map((group) => {
            const collapsed = collapsedGroups.has(group.id);
            return (
              <div key={group.id} className="daba-components-panel__group">
                <button
                  type="button"
                  className="daba-components-panel__group-header"
                  aria-expanded={!collapsed}
                  onClick={() => toggleGroup(group.id)}
                >
                  <span
                    className={`daba-components-panel__chevron${collapsed ? ' daba-components-panel__chevron--collapsed' : ''}`}
                  >
                    {'▸'}
                  </span>
                  {group.label}
                </button>
                {!collapsed && (
                  <div className="daba-components-panel__rows" role="tree">
                    {group.itemIds.map((id) => (
                      <ComponentsPanelRow
                        key={id}
                        id={id}
                        renderRow={renderRow}
                        onRename={onRename}
                        locateInsets={locateInsets}
                        viewport={viewport}
                        itemTestId={itemTestId}
                        itemAriaLabel={itemAriaLabel}
                        itemClassName={itemClassName}
                        onLocate={onLocate}
                        itemLabel={itemLabel}
                        renamingId={renamingId}
                        onRenameDismiss={onRenameDismiss}
                        renameInputTestId={renameInputTestId}
                        renameLabel={renameLabel}
                        moreLabel={moreLabel}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
    </div>
  );
}
