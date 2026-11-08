/**
 * The focus ring of every control (Lib-Foundations § 02): the ink, 2 px, offset 2, on every surface
 * (white on the dark ones, because `--jd-focus` follows the surface). Written as classes on the
 * component, and not only as the surface's base rule, because a dialog or a menu portals to `<body>`
 * outside any surface. A literal string, so Tailwind's scanner sees it.
 */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-focus)]";

/** The same ring for a field, which shows it with `:focus-visible` and `:focus` alike (a click focuses a field). */
export const FIELD_FOCUS_RING = "focus:outline-2 focus:outline-offset-2 focus:outline-[color:var(--jd-focus)]";
