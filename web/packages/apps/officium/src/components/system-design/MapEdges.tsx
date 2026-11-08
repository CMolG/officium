import type { PlacedEdge } from "../../lib/system-design/layout";

const MAX_LABEL = 28;
const clip = (label: string) => (label.length > MAX_LABEL ? `${label.slice(0, MAX_LABEL - 1)}…` : label);

/** The connections, in world coordinates inside the engine's pan layer so they pan and zoom with the cards. */
export function MapEdges({ edges, selectedId }: { edges: PlacedEdge[]; selectedId: string | null }) {
  return (
    <svg aria-hidden className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
      <defs>
        <marker id="system-map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--jd-ink)" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const text = edge.label ? clip(edge.label) : null;
        // Doc-Systema: with a node selected, its arrows turn ink and the others step back to a third.
        const touches = selectedId !== null && (edge.from === selectedId || edge.to === selectedId);
        const stepsBack = selectedId !== null && !touches;
        return (
          <g key={edge.key} data-testid="map-edge" data-from={edge.from} data-to={edge.to} opacity={stepsBack ? 0.35 : 1}>
            <path
              d={edge.d}
              fill="none"
              style={{ stroke: touches ? "var(--jd-ink)" : "color-mix(in srgb, var(--jd-ink) 50%, transparent)" }}
              strokeWidth={touches ? 2.25 : 1.5}
              strokeDasharray={edge.back ? "7 5" : undefined}
              markerEnd="url(#system-map-arrow)"
            />
            {text && (
              <g transform={`translate(${edge.labelAt.x} ${edge.labelAt.y})`}>
                <title>{edge.label}</title>
                {/* The label sits on a halo of the page color, not on a plate: it reads over the arrow. */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={11}
                  fontWeight={600}
                  paintOrder="stroke"
                  strokeWidth={5}
                  strokeLinejoin="round"
                  style={{ fill: touches ? "var(--jd-ink)" : "color-mix(in srgb, var(--jd-ink) 67%, transparent)", stroke: "var(--jd-page)" }}
                >
                  {text}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
