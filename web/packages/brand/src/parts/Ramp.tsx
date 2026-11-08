/** Evenly spread colors along a line in canvas units: the glass seal's background and shape ramps. */
export function Ramp({ id, colors, coords }: { id: string; colors: string[]; coords: Record<string, number> }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" {...coords}>
      {colors.map((color, i) => (
        <stop key={i} offset={colors.length > 1 ? i / (colors.length - 1) : 0} stopColor={color} />
      ))}
    </linearGradient>
  );
}
