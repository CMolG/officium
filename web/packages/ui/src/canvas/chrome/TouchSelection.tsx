'use client';

// packages/ui/src/canvas/chrome/TouchSelection.tsx
//
// What a touch canvas offers for the selection (Lib-Canvas "Touch"): "2 selected" with Duplicate and
// Delete, 44 px each, above the dock. The engine owns the selection but not what duplicating or
// deleting means, so the app passes both; with neither it paints nothing. It goes in `overlay`.

import { Tooltip } from '../../ui/tooltip';
import { useSelection } from '../react/hooks';

export interface TouchSelectionProps {
  onDuplicate?: (ids: string[]) => void;
  onDelete?: (ids: string[]) => void;
  /** "2 selected" in the app's language. */
  countLabel?: (count: number) => string;
  duplicateLabel?: string;
  deleteLabel?: string;
}

export function TouchSelection({
  onDuplicate,
  onDelete,
  countLabel = (count) => `${count} selected`,
  duplicateLabel = 'Duplicate',
  deleteLabel = 'Delete',
}: TouchSelectionProps) {
  const { ids } = useSelection();
  if (ids.size === 0 || (!onDuplicate && !onDelete)) return null;
  const list = [...ids];
  return (
    <div className="daba-touch-selection" role="group" aria-label={countLabel(ids.size)}>
      <span aria-live="polite">{countLabel(ids.size)}</span>
      <span style={{ display: 'flex', flexDirection: 'row', gap: 4 }}>
        {onDuplicate ? (
          <Tooltip label={duplicateLabel}>
            <button type="button" className="daba-touch-dock__item" aria-label={duplicateLabel} onClick={() => onDuplicate(list)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="14" height="14" x="8" y="8" rx="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </button>
          </Tooltip>
        ) : null}
        {onDelete ? (
          <Tooltip label={deleteLabel}>
            <button type="button" className="daba-touch-dock__item" aria-label={deleteLabel} onClick={() => onDelete(list)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </button>
          </Tooltip>
        ) : null}
      </span>
    </div>
  );
}
