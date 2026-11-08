import type { ComponentProps, ReactNode } from "react";
import { Doodle, type KidDoodle } from "@javadaba/brand/doodles";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { Text } from "./text";

/*
 * EmptyState: what a place says when there is nothing in it yet (Lib-Pieces § Empty state). Empty never
 * means broken and never leaves a person at a dead end. Every empty view answers three questions: what goes
 * here (the title), why it is empty (the sentence) and the one thing to do now (the action). The kid sets the
 * mood (`doodle`, one of the kid's names); the words carry the meaning. Never invented data to fill the hole.
 *
 * Full: centered, the kid, the title in the display voice, one sentence, the one action and, if there is
 * another door, a quiet second one. Compact (`compact`), inside a list or a table: no illustration under 240 px
 * of height, the title in UI weight, one sentence, one action, left aligned with the list it replaces.
 */

export interface EmptyStateProps extends Omit<ComponentProps<"div">, "title"> {
  /** What is missing: "No books yet." */
  title: ReactNode;
  /** Why it is empty and how to fill it: "Your books live here, on real pages." */
  children?: ReactNode;
  /** The one action that fills it (a `Button`). */
  action?: ReactNode;
  /** A quieter second door under the action (an `InlineLink`): "Or read a classic first". */
  secondary?: ReactNode;
  /** The mood: one of the kid's names (`wave` for a first use, `dizzy` for a filter that matched nothing, `mug` for all done). */
  doodle?: KidDoodle;
  /** Inside a list or a table: a row, no illustration. */
  compact?: boolean;
}

export function EmptyState({ title, children, action, secondary, doodle, compact = false, className, ...rest }: EmptyStateProps) {
  if (compact) {
    return (
      <div data-jd-component="EmptyState" data-compact="" className={cn("flex flex-row items-start gap-3.5 px-1 py-4", className)} {...rest}>
        <Glyph name="inbox" size={22} className="mt-0.5 text-[color:var(--jd-ink)]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="m-0 text-sm font-semibold text-[color:var(--jd-ink)]">{title}</p>
          {children ? <p className="m-0 text-xs leading-normal text-[color:var(--jd-faint)]">{children}</p> : null}
        </div>
        {action ? <div className="shrink-0 self-center">{action}</div> : null}
      </div>
    );
  }
  return (
    <div data-jd-component="EmptyState" className={cn("flex flex-col items-center gap-3.5 px-6 py-10 text-center", className)} {...rest}>
      {doodle ? <Doodle name={doodle} decorative size="page" /> : null}
      <Text as="h3" type="display-s">
        {title}
      </Text>
      {children ? (
        <Text as="p" type="body-s" tone="muted" className="m-0 max-w-[34ch]">
          {children}
        </Text>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
      {secondary ? <div>{secondary}</div> : null}
    </div>
  );
}
