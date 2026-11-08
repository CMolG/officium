/*
 * The type scale (Lib-Foundations § 04: three families, five voices). One table, so a size is a
 * NAME and an app never writes "text-[34px] leading-none font-bold" by hand.
 *
 * Doto speaks for the house (titles, names, numbers) and is never set under 20 px: the dots fall
 * apart. Montserrat does the work, labels the doors in capitals (the kicker) and, in italic, breaks
 * the rhythm (one line per chapter). The hand writes in the margin. Inside a voice, hierarchy comes
 * from weight, not from a new size.
 *
 * The large display steps shrink on a phone and reach their drawn size from `lg`; the strings are
 * literal so Tailwind's scanner (`@source` on packages/ui) sees every class, on the web and on
 * Android.
 */

export const TYPE_SCALE = {
  // Doto 700. h1/h2/h3 are the sheet-title steps (96 / 48 / 34) the kit draws.
  "display-xl": "font-[family-name:var(--font-jd-display)] font-bold text-[64px] leading-[0.95] md:text-[96px] lg:text-[120px]",
  "display-l": "font-[family-name:var(--font-jd-display)] font-bold text-[40px] leading-none md:text-[56px] lg:text-[68px]",
  "display-m": "font-[family-name:var(--font-jd-display)] font-bold text-[32px] leading-none md:text-[40px] lg:text-[48px]",
  "display-s": "font-[family-name:var(--font-jd-display)] font-bold text-[26px] leading-none",
  "display-xs": "font-[family-name:var(--font-jd-display)] font-bold text-[20px] leading-[1.05]",
  h1: "font-[family-name:var(--font-jd-display)] font-bold text-[56px] leading-[0.95] tracking-[-0.01em] md:text-[96px]",
  h2: "font-[family-name:var(--font-jd-display)] font-bold text-[32px] leading-none tracking-[-0.01em] md:text-[48px]",
  h3: "font-[family-name:var(--font-jd-display)] font-bold text-[34px] leading-none",
  // Montserrat.
  kicker: "font-[family-name:var(--font-jd-kicker)] text-[11px] font-bold uppercase leading-normal tracking-[0.16em]",
  "body-l": "font-[family-name:var(--font-jd-body)] text-lg font-normal leading-[1.6]",
  "body-m": "font-[family-name:var(--font-jd-body)] text-base font-normal leading-[1.65]",
  "body-s": "font-[family-name:var(--font-jd-body)] text-sm font-normal leading-[1.55]",
  ui: "font-[family-name:var(--font-jd-body)] text-sm font-semibold leading-[1.3]",
  caption: "font-[family-name:var(--font-jd-body)] text-xs font-medium leading-normal",
  "italic-l": "font-[family-name:var(--font-jd-italic)] text-[46px] font-medium italic leading-[1.1] tracking-[-0.01em]",
  "italic-m": "font-[family-name:var(--font-jd-italic)] text-[34px] font-medium italic leading-[1.15] tracking-[-0.01em]",
  "italic-s": "font-[family-name:var(--font-jd-italic)] text-[22px] font-medium italic leading-[1.3]",
  // Covered By Your Grace: margin notes, tilted 4 degrees (Lib-Foundations 04: "tilted 3 to 5 degrees")
  // and repeated from the page, so `Text` hides them from screen readers.
  "hand-l": "inline-block origin-left -rotate-[4deg] font-[family-name:var(--font-jd-hand)] text-[36px] leading-[1.05]",
  "hand-m": "inline-block origin-left -rotate-[4deg] font-[family-name:var(--font-jd-hand)] text-[30px] leading-[1.05]",
} as const;

export type TypeRole = keyof typeof TYPE_SCALE;

/** Whether a step is the hand: it repeats what the page already says, so assistive technology skips it. */
export const isHandRole = (role: TypeRole | undefined) => role === "hand-l" || role === "hand-m";

/** The classes of one step of the scale, for an element that is not a `Text`. */
export function typeClass(role: TypeRole): string {
  return TYPE_SCALE[role];
}
