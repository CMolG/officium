import { CENTER, DIAMOND_HALF_SPAN } from "../constants";
import type { BrandGradient } from "../registry";

function gradientCoords(g: BrandGradient) {
  // Figma angle (0°=left→right, 90°=top→bottom) interpreted ON SCREEN: the
  // gradient does NOT rotate with the diamond. Vector in the viewBox's y-down coords.
  const rad = (g.angle * Math.PI) / 180;
  const vx = Math.cos(rad);
  const vy = Math.sin(rad);
  return {
    x1: CENTER - vx * DIAMOND_HALF_SPAN,
    y1: CENTER - vy * DIAMOND_HALF_SPAN,
    x2: CENTER + vx * DIAMOND_HALF_SPAN,
    y2: CENTER + vy * DIAMOND_HALF_SPAN,
  };
}

export function Gradient({ id, g }: { id: string; g: BrandGradient }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" {...gradientCoords(g)}>
      {g.stops.map((s, i) => (
        <stop key={i} offset={`${s.at}%`} stopColor={s.color} />
      ))}
    </linearGradient>
  );
}
