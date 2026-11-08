import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { IconButton } from "./icon-button";
import { NOTE_TONES, type NoteTone } from "./note-tones";

/*
 * Alert (Lib-Pieces § Alert): news that stays in the page until it is resolved or dismissed. It never
 * times out (a timed toast takes the chance away at the pace of the page, WCAG 2.2.1), and it is a bigger
 * `Note`: a title in the tone's ink, a sentence in the ink, and at the end either the one action that
 * answers it or a dismiss. The tone has a SHAPE (tick, triangle, cross, info) so it reads in grayscale.
 * Warnings and errors are announced at once (`role="alert"`), the rest wait to be read (`role="status"`).
 */

export type AlertTone = Exclude<NoteTone, "neutral">;

export interface AlertProps extends Omit<ComponentProps<"div">, "title" | "children"> {
  tone?: AlertTone;
  /** What happened, in a few words: "The export failed." */
  title: ReactNode;
  /** What it means and what to do: one sentence, a link may close it. */
  children?: ReactNode;
  /** The one action that answers it (a `Button`), at the end of the row. */
  action?: ReactNode;
  /** Shows a dismiss button; the caller removes the alert. */
  onDismiss?: () => void;
  /** The dismiss button's name; a product in another language passes its own. */
  dismissLabel?: string;
}

export function Alert({ tone = "info", title, children, action, onDismiss, dismissLabel = "Dismiss", className, role, ...rest }: AlertProps) {
  const { box, shape, ink } = NOTE_TONES[tone];
  return (
    <div
      data-jd-component="Alert"
      data-tone={tone}
      role={role ?? (tone === "warning" || tone === "danger" ? "alert" : "status")}
      className={cn("flex flex-row items-start gap-3.5 rounded-2xl py-[18px] pl-5 pr-[18px] text-[color:var(--jd-ink)]", box, className)}
      {...rest}
    >
      {shape && <Glyph name={shape} size={20} className={cn("mt-px", ink)} />}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn("text-sm font-semibold", ink)}>{title}</span>
        {children && <div className="text-sm leading-normal text-[color:var(--jd-ink)]">{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
      {onDismiss && (
        <IconButton aria-label={dismissLabel} onClick={onDismiss} className={cn("-mr-1.5 -mt-2", ink)}>
          <Glyph name="x" />
        </IconButton>
      )}
    </div>
  );
}
