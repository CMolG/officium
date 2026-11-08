'use client';

// packages/ui/src/canvas/chrome/SideToolbar.tsx
//
// The right side bar. Port of the `InspectorPanel.tsx` shell (Fluxor):
// routing by 0/1/N selection (render props), collapsible header, floating
// re-expand button. `chrome.panels.sideToolbar` state lives in the
// engine's store (persistence via the `onChange` the consumer passes to
// `EngineProvider`).
//
// On a touch screen (a finger is the main pointer) the bar does not hang beside the field: its one
// button stays where the panel was and opens the same body as a bottom sheet (Lib-Canvas "Touch").
//
// NOTE: since `../fluxor/fluxor-ide` is out of reading scope in this run,
// this is a reconstruction from the CONTRACT the plan describes.

import type { ReactNode } from 'react';
import type { EngineItem } from '../core/store';
import { useEngineSelector, useSelection } from '../react/hooks';
import { useCoarsePointer } from '../react/useCoarsePointer';
import { usePanelOpen } from '../react/usePanelOpen';
import { InspectorSheet } from './InspectorSheet';
import { PanelFoldButton } from './PanelFoldButton';

const DEFAULT_PANEL_KEY = 'sideToolbar';

export interface SideToolbarProps {
  title?: string;
  renderEmpty?(): ReactNode;
  renderOne(item: EngineItem): ReactNode;
  renderMany(items: EngineItem[]): ReactNode;
  className?: string;
  /**
   * Key under `state.chrome.panels` that governs THIS bar's collapse.
   * Default: `'sideToolbar'` (the value that used to be a fixed constant
   * — no change for anyone not passing the prop). Useful for mounting
   * more than one `SideToolbar` in the same app (e.g. an inspector and a
   * help panel) without them sharing the same collapse bit.
   */
  panelKey?: string;
  /** `data-testid` passthrough for the collapse button (default: no testid). */
  collapseButtonTestId?: string;
  /** `data-testid` passthrough for the re-expand button (default: no testid). */
  expandButtonTestId?: string;
}

export function SideToolbar({
  title = 'Inspector',
  renderEmpty,
  renderOne,
  renderMany,
  className,
  panelKey = DEFAULT_PANEL_KEY,
  collapseButtonTestId,
  expandButtonTestId,
}: SideToolbarProps) {
  const selection = useSelection();
  const allItems = useEngineSelector((state) => state.items);
  const [open, setOpen] = usePanelOpen(panelKey);
  const touch = useCoarsePointer();

  // Folded, one button is left where the panel was (Lib-Canvas).
  if (!open && !touch) {
    return (
      <PanelFoldButton
        name={title.toLowerCase()}
        folded
        side="right"
        onToggle={() => setOpen(true)}
        testId={expandButtonTestId}
        className={['daba-panel-fold--standalone', className].filter(Boolean).join(' ')}
      />
    );
  }

  const items = [...selection.ids].map((id) => allItems[id]).filter((item): item is EngineItem => Boolean(item));

  let body: ReactNode = null;
  if (items.length === 0) body = renderEmpty ? renderEmpty() : null;
  else if (items.length === 1) body = renderOne(items[0]);
  else body = renderMany(items);

  if (touch) {
    return (
      <InspectorSheet title={title} className={className} testId={expandButtonTestId}>
        {body}
      </InspectorSheet>
    );
  }

  return (
    <div className={['daba-side-toolbar', className].filter(Boolean).join(' ')}>
      <div className="daba-side-toolbar__header">
        <span className="daba-side-toolbar__title">{title}</span>
        <PanelFoldButton
          name={title.toLowerCase()}
          folded={false}
          side="right"
          onToggle={() => setOpen(false)}
          testId={collapseButtonTestId}
        />
      </div>
      <div className="daba-side-toolbar__body">{body}</div>
    </div>
  );
}
