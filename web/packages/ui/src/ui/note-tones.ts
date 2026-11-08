import type { GlyphName } from "./glyph";

export type NoteTone = "info" | "success" | "warning" | "danger" | "neutral";

/** The tones of every notice that stays in the page (`Note`, `Alert`): the tint, the shape and the ink of the shape. */
export const NOTE_TONES: Record<NoteTone, { box: string; shape?: GlyphName; ink?: string }> = {
  info: { box: "bg-[color:var(--jd-info-bg)]", shape: "info-circle", ink: "text-[color:var(--jd-info)]" },
  success: { box: "bg-[color:var(--jd-ok-bg)]", shape: "check-circle", ink: "text-[color:var(--jd-ok)]" },
  warning: { box: "bg-[color:var(--jd-warn-bg)]", shape: "alert-triangle", ink: "text-[color:var(--jd-warn)]" },
  danger: { box: "bg-[color:var(--jd-bad-bg)]", shape: "x-circle", ink: "text-[color:var(--jd-bad)]" },
  neutral: { box: "bg-[color:var(--jd-card)]" },
};

