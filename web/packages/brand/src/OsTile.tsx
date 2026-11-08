import { CANVAS, OS_DOT, OS_DOT_GLYPHS, OS_TILE } from "./constants";

/**
 * The "os" variant's letters as one path of square dots (`OS_DOT_GLYPHS`), not as
 * `<text>`: the rasterized icons have no typefaces (see `OS_DOT` in constants.ts).
 * A letter not in the map paints nothing, same as an `icon` not in `ICONS`: it's a
 * bug in the registry entry, not a case to cover here.
 */
function dotsPath(letters: string): string {
  const { x, y, pitch, size, advance } = OS_DOT;
  let d = "";
  [...letters].forEach((letter, i) => {
    OS_DOT_GLYPHS[letter]?.forEach((row, r) => {
      [...row].forEach((cell, c) => {
        if (cell === "#") d += `M${x + (i * advance + c) * pitch} ${y + r * pitch}h${size}v${size}h-${size}z`;
      });
    });
  });
  return d;
}

/**
 * The "os" variant, which is the same tile in EVERY format (JAVA-268: "standardized
 * everywhere it appears"), as the design draws it (Lib-Brand 11): a graphite rounded square,
 * a field of small white dots, a hair of light along its top edge and the dotted letters.
 * It has no diamond to put in a `spinner`, so the spinner turns the tile; and no grain.
 */
export function OsTile({ id, letters }: { id: string; letters: string }) {
  const { dots, topLight } = OS_TILE;
  return (
    <>
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect width={CANVAS} height={CANVAS} rx={OS_TILE.radius} />
        </clipPath>
        <pattern id={`${id}-dots`} width={dots.pitch} height={dots.pitch} patternUnits="userSpaceOnUse">
          <circle cx={dots.pitch / 2} cy={dots.pitch / 2} r={dots.radius} fill="#FFFFFF" fillOpacity={dots.opacity} />
        </pattern>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={CANVAS} height={CANVAS} fill={OS_TILE.fill} />
        <rect width={CANVAS} height={CANVAS} fill={`url(#${id}-dots)`} />
        <rect width={CANVAS} height={topLight.height} fill="#FFFFFF" fillOpacity={topLight.opacity} />
      </g>
      <path d={dotsPath(letters)} fill="#FFFFFF" />
    </>
  );
}
