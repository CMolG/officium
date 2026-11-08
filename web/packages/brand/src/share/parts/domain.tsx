/** The page's address, 24 px, one line, beside the mark. */
export function Domain({ text, left = 200, bottom = 60, color = "rgba(17,17,17,.55)" }: { text: string; left?: number; bottom?: number; color?: string }) {
  return (
    <div
      style={{
        display: "flex",
        position: "absolute",
        left,
        bottom,
        maxWidth: 460,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        fontSize: 24,
        fontWeight: 600,
        color,
      }}
    >
      {text}
    </div>
  );
}
