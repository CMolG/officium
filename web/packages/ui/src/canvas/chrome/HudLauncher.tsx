'use client';

// packages/ui/src/canvas/chrome/HudLauncher.tsx
//
// Which HUD widgets are on (Lib-Canvas "HUD · launcher"): one pressed-or-not icon button per widget in
// a group named "Widgets", each naming itself with the shared Tooltip (hover, focus, long press), with
// an optional badge (an unread counter). It replaces the menu this used to open: a toggle that is
// always in view says what is on without a click.

import type { ReactNode } from 'react';
import { Tooltip } from '../../ui/tooltip';
import type { HudWidgetSpec, HudWidgetState } from './HudLayer';

export interface HudLauncherProps {
  widgets: HudWidgetSpec[];
  state: Record<string, HudWidgetState>;
  onToggle(type: string): void;
  /** Optional badge per widget (e.g. an unread counter). */
  badge?: (type: string) => ReactNode | undefined;
  /** The group's name: "Widgets". */
  label?: string;
  className?: string;
}

export function HudLauncher({ widgets, state, onToggle, badge, label = 'Widgets', className }: HudLauncherProps) {
  return (
    <div className={['daba-hud-launcher', className].filter(Boolean).join(' ')} role="group" aria-label={label}>
      {widgets.map((widget) => {
        const visible = state[widget.type]?.visible ?? false;
        return (
          <Tooltip key={widget.type} label={widget.title}>
            <button
              type="button"
              className="daba-hud-launcher__item"
              aria-label={widget.title}
              aria-pressed={visible}
              onClick={() => onToggle(widget.type)}
            >
              <span className="daba-hud-launcher__icon">{widget.icon}</span>
              {badge?.(widget.type)}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
