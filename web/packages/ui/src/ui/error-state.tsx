import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { Panel } from "./panel";

/*
 * ErrorState: a region that could not load (Lib-Pieces § Error state). An error never just offers the same
 * button again. It says what failed in plain words, what is safe ("Your articles are safe and nothing was
 * charged."), and gives a second door: somewhere else to go, or a way to tell us. The red title carries a
 * shape, so it reads in grayscale. For a whole page that does not exist use `NotFound`, which is a 404.
 */

export interface ErrorStateProps extends Omit<ComponentProps<"div">, "title"> {
  /** What failed, in the person's words: "We couldn't load your history." */
  title: ReactNode;
  /** Why, and what is safe. */
  children?: ReactNode;
  /** The doors: a "Try again" (outline) and a second way on, such as "Report a problem" (ghost). */
  actions?: ReactNode;
}

export function ErrorState({ title, children, actions, className, ...rest }: ErrorStateProps) {
  return (
    <Panel
      material="raised"
      radius="lg"
      role="alert"
      data-jd-component="ErrorState"
      className={cn("flex flex-col gap-2.5 p-[22px]", className)}
      {...rest}
    >
      <span className="flex flex-row items-center gap-2 text-sm font-semibold text-[color:var(--jd-bad)]">
        <Glyph name="x-circle" size={18} />
        {title}
      </span>
      {children ? <p className="m-0 text-sm leading-normal text-[color:var(--jd-muted)]">{children}</p> : null}
      {actions ? <div className="flex flex-row flex-wrap items-center gap-2">{actions}</div> : null}
    </Panel>
  );
}
