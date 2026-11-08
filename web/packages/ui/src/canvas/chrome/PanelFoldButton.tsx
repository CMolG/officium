'use client';

// packages/ui/src/canvas/chrome/PanelFoldButton.tsx
//
// The button that folds a chrome panel and, once folded, the one button left where the panel was
// (Lib-Canvas: "Folded panels leave one button where they were"). Its name says which panel and
// which way: "Fold components panel" / "Unfold components panel".

export interface PanelFoldButtonProps {
  /** The panel's name, lower case, in the button's name ("components panel"). */
  name: string;
  folded: boolean;
  onToggle: () => void;
  /** Which edge the panel hangs from; the chevron points at it when folding. */
  side?: 'left' | 'right';
  className?: string;
  /** `data-testid` passthrough (default: none). */
  testId?: string;
}

export function PanelFoldButton({ name, folded, onToggle, side = 'left', className, testId }: PanelFoldButtonProps) {
  const toward = (side === 'left') === !folded;
  return (
    <button
      type="button"
      className={['daba-panel-fold', folded && 'daba-panel-fold--folded', className].filter(Boolean).join(' ')}
      aria-label={`${folded ? 'Unfold' : 'Fold'} ${name}`}
      aria-expanded={!folded}
      data-testid={testId}
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={toward ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
      </svg>
    </button>
  );
}
