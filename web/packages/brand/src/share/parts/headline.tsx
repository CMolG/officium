import { words } from "./words";

/** The headline, then the optional accent phrase in the product's ink, italic 800. */
export function Headline({
  text,
  accent,
  size,
  color,
  ink,
  align,
  maxWidth,
}: {
  text: string;
  accent?: string;
  size: number;
  color: string;
  ink: string;
  align: "center" | "left";
  maxWidth: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: size * 0.27,
        maxWidth,
      }}
    >
      {words(text, { size, color })}
      {accent && (
        // The accent phrase is one unit: it wraps as a whole, never in the middle of "One free account."
        <div style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", columnGap: size * 0.27 }}>
          {words(accent, { size, color: ink, italic: true })}
        </div>
      )}
    </div>
  );
}
