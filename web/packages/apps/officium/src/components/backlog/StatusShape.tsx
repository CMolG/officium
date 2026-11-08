import type { Status } from "../../lib/backlog/types";
import { STATUS_CONFIG } from "../../lib/backlog/status-config";

/**
 * A polygon per state -- axis 2 of `doc://contracts/art-direction`: hard, quantized
 * geometry, the number of sides IS the state ("3 sides for the first, 8 for the last"). Adapted
 * from `../officium-concept/src/components/backlog/StatusShape.tsx`, generalized to a regular
 * polygon formula instead of a hand-written point list per side count, since Officium's six
 * states span 3..8 sides (the concept only went up to 7 and started at 2, a degenerate "bar").
 *
 * Painted in the state's own colours, as the concept did (`fill` + `line`, see `globals.css`).
 * The first port drew every state in the same grey; the colour came back on 2026-09-15.
 */
export function StatusShape({
  status,
  className,
  title,
}: {
  status: Status;
  className?: string;
  title?: string;
}) {
  const { sides, tone } = STATUS_CONFIG[status];
  const cx = 12;
  const cy = 12;
  const r = 9;
  // Point up (start at -90deg) so every polygon reads with a consistent "peak", the way the
  // triangle and square naturally do.
  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (-90 + (360 / sides) * i) * (Math.PI / 180);
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
    >
      {title && <title>{title}</title>}
      {/* Rejected is the only outline (Off-Vocab): discarded, so nothing fills it. */}
      <polygon points={points} fill={status === "rejected" ? "none" : tone.fill} stroke={tone.line} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
}
