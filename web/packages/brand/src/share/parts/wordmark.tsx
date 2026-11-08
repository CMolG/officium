/** The product's name in Doto 900, 64 px, with its dot in the accent. */
export function Wordmark({ name, ink, color = "#111111", size = 64 }: { name: string; ink: string; color?: string; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontFamily: "Doto",
        fontWeight: 900,
        fontSize: size,
        letterSpacing: size * 0.02,
        lineHeight: 1,
        color,
        whiteSpace: "nowrap",
      }}
    >
      <span>{name}</span>
      <span style={{ color: ink }}>.</span>
    </div>
  );
}
