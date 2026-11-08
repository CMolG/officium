import type { CSSProperties } from "react";

/*
 * The plain look of the six mockups, in the board's own numbers (Lib-Share `.shuf*`). Inline styles, so
 * the package needs no stylesheet and no Tailwind `@source`.
 */
export const INK = "#111111";
export const LINK = "#1D63D8";

/** One mockup's outer box: white, 16 px corner, a hairline, 14 px type. */
export const FRAME: CSSProperties = {
  display: "flex",
  gap: 12,
  padding: 16,
  borderRadius: 16,
  background: "#FFFFFF",
  boxShadow: "0 0 0 1px rgba(17,17,17,.1)",
  fontSize: 14,
  lineHeight: 1.45,
  color: INK,
  minWidth: 0,
  fontFamily: "var(--font-jd-body, Montserrat), ui-sans-serif, sans-serif",
};

export const COLUMN: CSSProperties = { display: "flex", flexDirection: "column", minWidth: 0 };
export const ROW: CSSProperties = { display: "flex", flexDirection: "row", alignItems: "center" };
export const HELP: CSSProperties = { color: "rgba(17,17,17,.62)" };
