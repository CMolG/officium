import { DIAMOND_SHADOWS, type ShadowLayer } from "../constants";

/** Stack of drop-shadows layered behind the element.
 *  `layers` defaults to `DIAMOND_SHADOWS` (the spinner's and the API seal's mark); the glass
 *  seal passes its own. */
export function DropShadowFilter({ id, layers = DIAMOND_SHADOWS }: { id: string; layers?: ShadowLayer[] }) {
  return (
    <filter id={id} x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
      {layers.map((s, i) => (
        <g key={i}>
          <feGaussianBlur in="SourceAlpha" stdDeviation={s.std} result={`blur${i}`} />
          <feOffset in={`blur${i}`} dx={s.dx} dy={s.dy} result={`off${i}`} />
          <feFlood floodColor={s.color} floodOpacity={s.opacity} result={`col${i}`} />
          <feComposite in={`col${i}`} in2={`off${i}`} operator="in" result={`sh${i}`} />
        </g>
      ))}
      <feMerge>
        {layers.map((_, i) => (
          <feMergeNode key={i} in={`sh${i}`} />
        ))}
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}
