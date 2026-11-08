import { ICON_INNER_SHADOW } from "../constants";

/** Inner-shadow for the lucide glyph (inner relief). `shadow` is in the glyph's 24 grid. */
export function InnerShadowFilter({
  id,
  shadow: s = ICON_INNER_SHADOW,
}: {
  id: string;
  shadow?: { dx: number; dy: number; std: number; spread: number; color: string; opacity: number };
}) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
      <feComponentTransfer in="SourceAlpha" result="inv">
        <feFuncA type="table" tableValues="1 0" />
      </feComponentTransfer>
      <feMorphology in="inv" operator="dilate" radius={s.spread} result="invsp" />
      <feGaussianBlur in="invsp" stdDeviation={s.std} result="blur" />
      <feOffset in="blur" dx={s.dx} dy={s.dy} result="off" />
      <feFlood floodColor={s.color} floodOpacity={s.opacity} result="col" />
      <feComposite in="col" in2="off" operator="in" result="sh" />
      <feComposite in="sh" in2="SourceAlpha" operator="in" result="clip" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="clip" />
      </feMerge>
    </filter>
  );
}
