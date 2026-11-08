'use client';

// packages/ui/src/canvas/chrome/ComponentsPanelRow.tsx
//
// One row of the components panel: click centers it on the field, hover lights it there, double-click
// renames it in place, and `menuTarget` plus a visible More button open its kind's menu. Split out
// of `ComponentsPanel.tsx`, which keeps the groups, the header and the fold.

import { useEffect, useState, type ReactNode } from 'react';
import { viewportSize } from '@javadaba/sdk/platform';
import { centerOn } from '../core/camera';
import type { EngineItem } from '../core/store';
import type { Insets, Size } from '../core/types';
import { menuTarget } from '../../feedback/menu-model';
import { MoreButton } from '../../feedback/MoreButton';
import { useCamera, useEngine, useEngineItem, useHoveredItem } from '../react/hooks';

function defaultViewport(): Size {
  const viewport = viewportSize();
  return viewport ? { width: viewport.w, height: viewport.h } : { width: 0, height: 0 };
}

/** Resolves `viewport` at call time — only invokes the function if `viewport` is one, never at render (see the docs on `ComponentsPanelProps.viewport`). */
function resolveViewport(viewport: Size | (() => Size) | undefined): Size {
  if (typeof viewport === 'function') return viewport();
  return viewport ?? defaultViewport();
}

export interface ComponentsPanelRowProps {
  id: string;
  renderRow?(item: EngineItem): ReactNode;
  onRename?(id: string, name: string): void;
  locateInsets?: Insets;
  viewport?: Size | (() => Size);
  itemTestId?(item: EngineItem): string | undefined;
  itemAriaLabel?(item: EngineItem): string | undefined;
  itemClassName?(item: EngineItem): string | undefined;
  onLocate?(item: EngineItem): void;
  itemLabel?(item: EngineItem): string;
  renamingId?: string | null;
  onRenameDismiss?(): void;
  renameInputTestId?(item: EngineItem): string | undefined;
  /** The rename field's name: "Rename layer". */
  renameLabel?: string;
  /** The visible way into the row's menu: "More actions for Hero image". */
  moreLabel?(name: string): string;
}

export function ComponentsPanelRow({
  id,
  renderRow,
  onRename,
  locateInsets,
  viewport,
  itemTestId,
  itemAriaLabel,
  itemClassName,
  onLocate,
  itemLabel,
  renamingId,
  onRenameDismiss,
  renameInputTestId,
  renameLabel = 'Rename layer',
  moreLabel = (name) => `More actions for ${name}`,
}: ComponentsPanelRowProps) {
  const engine = useEngine();
  const camera = useCamera();
  const item = useEngineItem(id);
  const { hoveredItemId, setHoveredItemId } = useHoveredItem();
  // Present (even `null`) => controlled mode: the internal dblclick gets
  // deactivated and it is the consumer who decides which row is in rename.
  const isRenameControlled = renamingId !== undefined;
  const [uncontrolledRenaming, setUncontrolledRenaming] = useState(false);
  const [value, setValue] = useState('');

  const isRenaming = isRenameControlled ? renamingId === id : uncontrolledRenaming;
  const label = item ? (itemLabel ? itemLabel(item) : item.id) : '';

  // Input seed: fires on ENTERING edit mode, whether by dblclick
  // (uncontrolled) or because the consumer set `renamingId === id`
  // (controlled) — a single seed point instead of duplicating it on
  // every entry path. Deliberately does NOT depend on `label`: if the
  // item's name changes while it is being edited, whatever the user is
  // already typing must not get overwritten.
  useEffect(() => {
    if (isRenaming) setValue(label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRenaming]);

  if (!item) return null;

  const locate = (): void => {
    const rect = { x: item.position.x, y: item.position.y, width: item.size.width, height: item.size.height };
    const pan = centerOn(rect, resolveViewport(viewport), camera.zoom, locateInsets);
    engine.setState({ camera: { pan, zoom: camera.zoom } });
    onLocate?.(item);
  };

  const startRename = (): void => {
    setUncontrolledRenaming(true);
  };

  // Commit (Enter AND blur in BOTH modes — parity with Fluxor's real
  // rename input, `NodeTree.tsx:462,886,1108`: `onBlur={commitRename}`,
  // with no distinction between Enter and blur). In controlled mode
  // `onRenameDismiss` gets called ALWAYS on close, even if the value was
  // empty and there was no commit (closing edit mode does not depend on
  // whether there was a commit).
  const commit = (): void => {
    const shouldRename = onRename && value.trim().length > 0;
    if (isRenameControlled) {
      if (shouldRename) onRename!(id, value.trim());
      onRenameDismiss?.();
    } else {
      setUncontrolledRenaming(false);
      if (shouldRename) onRename!(id, value.trim());
    }
  };

  // Dismiss (solo Escape) — SIN commit, en ambos modos.
  const dismiss = (): void => {
    if (isRenameControlled) onRenameDismiss?.();
    else setUncontrolledRenaming(false);
  };

  return (
    <div
      className={['daba-components-panel__row', itemClassName?.(item)].filter(Boolean).join(' ')}
      role="treeitem"
      aria-selected={hoveredItemId === id}
      data-daba-highlighted={hoveredItemId === id ? 'true' : undefined}
      data-testid={itemTestId?.(item)}
      aria-label={itemAriaLabel?.(item)}
      onMouseEnter={() => setHoveredItemId(id)}
      onMouseLeave={() => setHoveredItemId(null)}
      onClick={locate}
      onDoubleClick={!isRenameControlled && onRename ? startRename : undefined}
      {...menuTarget(item.kind, id)}
    >
      {isRenaming ? (
        <input
          className="daba-components-panel__rename-input"
          aria-label={renameLabel}
          data-testid={renameInputTestId?.(item)}
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') dismiss();
          }}
          onClick={(event) => event.stopPropagation()}
        />
      ) : renderRow ? (
        renderRow(item)
      ) : (
        <span className="daba-components-panel__row-label">{label}</span>
      )}
      {isRenaming ? null : (
        // Pressing More must not also locate the row: it opens the same menu a right-click opens.
        <span className="ml-auto flex shrink-0 flex-row" onClick={(event) => event.stopPropagation()}>
          <MoreButton aria-label={moreLabel(label)} className="size-8 pointer-coarse:size-11" />
        </span>
      )}
    </div>
  );
}
