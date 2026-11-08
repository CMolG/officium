/**
 * Words as flex items so a headline wraps and mixes weights; Satori has no inline formatting. A plain
 * function returning elements, not a component: Satori cannot render a component that returns an array.
 */
export function words(
  text: string,
  { size, color, italic = false, weight = 800 }: { size: number; color: string; italic?: boolean; weight?: 500 | 600 | 800 },
) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, i) => (
      <span
        key={`${i}-${word}`}
        style={{
          display: "flex",
          fontSize: size,
          fontWeight: weight,
          fontStyle: italic ? "italic" : "normal",
          lineHeight: 1.16,
          letterSpacing: -size * 0.015,
          color,
        }}
      >
        {word}
      </span>
    ));
}
