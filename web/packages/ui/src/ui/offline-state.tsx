import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { Panel } from "./panel";

/*
 * OfflineState: the connection is gone but the work is not (Lib-Pieces § Error state, Offline). It says so
 * in one line and what still works: "Keep writing: changes stay on this device and sync when you're back."
 * It is a status, not an alert: nothing is broken, so it does not interrupt.
 */

export interface OfflineStateProps extends Omit<ComponentProps<"div">, "title"> {
  /** "You're offline." */
  title: ReactNode;
  /** What still works and what happens when the connection is back. */
  children?: ReactNode;
}

export function OfflineState({ title, children, className, ...rest }: OfflineStateProps) {
  return (
    <Panel
      material="raised"
      radius="lg"
      role="status"
      data-jd-component="OfflineState"
      className={cn("flex flex-row items-start gap-3.5 p-[22px]", className)}
      {...rest}
    >
      <Glyph name="wifi-off" size={22} strokeWidth={1.75} className="text-[color:var(--jd-ink)]" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-semibold text-[color:var(--jd-ink)]">{title}</span>
        {children ? <p className="m-0 text-sm leading-normal text-[color:var(--jd-muted)]">{children}</p> : null}
      </div>
    </Panel>
  );
}
