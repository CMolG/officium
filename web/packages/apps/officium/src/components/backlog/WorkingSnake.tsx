/**
 * The "an agent is actively working on this card" border (officium-api.md §4.1): a segment that
 * runs around the card's edge like the game of snake, so the card itself reads as an
 * indeterminate progress indicator. Drawn as SVG `rect`s with `pathLength="100"`, which is what
 * keeps the speed constant along straight edges AND corners -- a rotating conic gradient would
 * sweep by angle and visibly rush through the short sides.
 *
 * Head, body and tail are three dashes of decreasing length and opacity whose leading ends are
 * aligned (see `globals.css`), which fakes a fading tail without a gradient along the path.
 * Under reduced motion the segments are hidden and the track turns into a steady solid border:
 * the state is still shown, it just doesn't move (`interface-psychology.md` point 5).
 *
 * The parent must be `position: relative`; the SVG overflows it so the stroke sits ON the card's
 * own 1px border instead of inside the padding.
 */
export function WorkingSnake({ radius = 16 }: { radius?: number }) {
  return (
    <svg aria-hidden="true" className="officium-snake pointer-events-none absolute inset-0 size-full overflow-visible">
      <rect className="officium-snake-track" width="100%" height="100%" rx={radius} pathLength={100} />
      {/* Tail, body, head -- their lengths and keyframes live in `globals.css`, by position. */}
      {["tail", "body", "head"].map((part) => (
        <rect key={part} className="officium-snake-segment" width="100%" height="100%" rx={radius} pathLength={100} />
      ))}
    </svg>
  );
}
