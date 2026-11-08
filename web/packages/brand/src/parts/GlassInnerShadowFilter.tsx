/**
 * The glass inner shadow (`GLASS_INNER_SHADOW`) of a shape that can be translucent, as the pane
 * is at 10%: its alpha is first made solid, or the shadow would come out at a tenth of its
 * strength. Offset and blurred before it is inverted, never inverted first: a shape's inverse
 * lies outside the canvas, which librsvg does not paint.
 *
 * The blur of the offset shape is computed twice and the larger value kept. librsvg drops what a
 * filter puts past the canvas, so a shape that reaches the edge (the OS tile, the background shape)
 * loses part of it: offset then blurred, the shifted shape past the right and bottom edges is gone;
 * blurred then offset, the blur past the top and left edges is. Each copy is exact where the other
 * is short, and both only ever come out short, so their maximum is right on all four sides. The
 * maximum is `feBlend lighten`, which compares colors, not alphas: hence the gray copies.
 * (`edgeMode="duplicate"` would do it in one, but librsvg ignores it on a blur.)
 */
export function GlassInnerShadowFilter({
  id,
  shadow: s,
}: {
  id: string;
  shadow: { dx: number; dy: number; std: number; color: string; opacity: number };
}) {
  const alphaToGray = "0 0 0 1 0  0 0 0 1 0  0 0 0 1 0  0 0 0 0 1";
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feComponentTransfer in="SourceAlpha" result="solid">
        <feFuncA type="linear" slope={100} />
      </feComponentTransfer>
      <feOffset in="solid" dx={s.dx} dy={s.dy} result="offFirst" />
      <feGaussianBlur in="offFirst" stdDeviation={s.std} result="blurA" />
      <feColorMatrix in="blurA" type="matrix" values={alphaToGray} result="grayA" />
      <feGaussianBlur in="solid" stdDeviation={s.std} result="blurFirst" />
      <feOffset in="blurFirst" dx={s.dx} dy={s.dy} result="blurB" />
      <feColorMatrix in="blurB" type="matrix" values={alphaToGray} result="grayB" />
      <feBlend in="grayA" in2="grayB" mode="lighten" result="covered" />
      {/* Gray back to alpha, inverted: what the shifted, blurred shape leaves uncovered. */}
      <feColorMatrix
        in="covered"
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1 0 0 0 1"
        result="outside"
      />
      <feFlood floodColor={s.color} floodOpacity={s.opacity} result="col" />
      <feComposite in="col" in2="outside" operator="in" result="sh" />
      <feComposite in="sh" in2="solid" operator="in" result="clip" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="clip" />
      </feMerge>
    </filter>
  );
}
