'use client';

// packages/ui/src/canvas/chrome/InspectorSheet.tsx
//
// The inspector on a touch screen (Lib-Canvas "Touch": "the inspector opens as a bottom sheet"). The
// side bar has no room beside a field a finger is moving, so the panel's one button stays where it
// was and opens the same body as a bottom sheet over the field.

import { useState, type ReactNode } from 'react';
import { Sheet, SheetContent, SheetTitle } from '../../ui/sheet';
import { SheetHeader } from '../../ui/sheet-header';
import { PanelFoldButton } from './PanelFoldButton';

export interface InspectorSheetProps {
  title: string;
  children: ReactNode;
  className?: string;
  testId?: string;
}

export function InspectorSheet({ title, children, className, testId }: InspectorSheetProps) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <PanelFoldButton
        name={title.toLowerCase()}
        folded
        side="right"
        onToggle={() => setOpen(true)}
        testId={testId}
        className={['daba-panel-fold--standalone', className].filter(Boolean).join(' ')}
      />
      <SheetContent side="bottom" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
