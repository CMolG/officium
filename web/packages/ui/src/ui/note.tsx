import type { ComponentProps, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Glyph } from "./glyph";
import { NOTE_TONES, type NoteTone } from "./note-tones";

/*
 * Note — a notice that stays in the page (Lib-Controls `.note`, used across the product sheets).
 *
 * A tinted box, radius 12, 13 px, with a SHAPE before the words (a tick, a triangle, a cross, an
 * info circle), so the tone reads in grayscale before the color helps. The tint and the shape's ink
 * are the status pairs from `tokens.css`; the text stays the ink so it always passes contrast.
 * `neutral` is a stone box with no shape: a plain aside.
 *
 * A note whose news is bad or urgent announces itself (`role="alert"`); the rest are `role="note"`
 * and wait to be read. Toasts are the transient version (`toast`); this one is for what must stay.
 */

export type { NoteTone } from "./note-tones";

export interface NoteProps extends Omit<ComponentProps<"div">, "children"> {
  tone?: NoteTone;
  /** Replaces the tone's shape. Pass your own glyph; `null` draws none. */
  icon?: ReactNode | null;
  children: ReactNode;
}

export function Note({ tone = "info", icon, className, children, role, ...rest }: NoteProps) {
  const { box, shape, ink } = NOTE_TONES[tone];
  return (
    <div
      data-jd-component="Note"
      data-tone={tone}
      role={role ?? (tone === "danger" ? "alert" : "note")}
      className={cn(
        "flex flex-row items-start gap-2.5 rounded-xl px-3.5 py-3 text-[13px] leading-normal text-[color:var(--jd-ink)]",
        box,
        className,
      )}
      {...rest}
    >
      {icon === null ? null : (
        <span className={cn("mt-0.5 shrink-0", ink)}>{icon ?? (shape ? <Glyph name={shape} size={16} /> : null)}</span>
      )}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
