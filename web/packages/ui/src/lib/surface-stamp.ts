/*
 * The surface a floating layer was opened from, so its portal can wear it too.
 *
 * Radix portals to `document.body`, outside every `.jd-surface` / `[data-jd-surface]` / `.jdui`,
 * so inside the portal the `--jd-*` tokens don't exist and the sheet paints transparent. The part
 * that renders in place (a trigger, an anchor) reads its surface with `surfaceOf`, and the content
 * re-stamps it. The full story is in `popover.tsx`, where it was found.
 */

/** How to re-stamp, inside the portal, the surface a layer was opened from. */
export interface SurfaceStamp {
  /** Value of the ancestor's `data-jd-surface`, if it had one. */
  kind?: string;
  /** Surface classes that need to be repeated (`jd-surface`, `jdui`). */
  className: string;
}

/** With no surface found, the product one: better the wrong polarity than no sheet at all. */
export const DEFAULT_STAMP: SurfaceStamp = { className: "jd-surface" };

/** Reads from the DOM which surface an element belongs to. */
export function surfaceOf(element: HTMLElement | null): SurfaceStamp {
  const host = element?.closest<HTMLElement>("[data-jd-surface], .jd-surface, .jdui");
  if (!host) return DEFAULT_STAMP;

  const kind = host.getAttribute("data-jd-surface") ?? undefined;
  const classes: string[] = [];
  if (host.classList.contains("jdui")) classes.push("jdui");
  // `jd-surface` only when there's no `kind`: with the attribute, it already publishes
  // the tokens, and the class would stack the product surface on top of it.
  if (!kind && host.classList.contains("jd-surface")) classes.push("jd-surface");
  if (!kind && classes.length === 0) return DEFAULT_STAMP;

  return { kind, className: classes.join(" ") };
}
