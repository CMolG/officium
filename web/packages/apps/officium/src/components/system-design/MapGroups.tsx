import type { PlacedGroup } from "../../lib/system-design/layout";

/** The group boxes, behind everything: a labelled outline around the nodes that belong together. */
export function MapGroups({ groups }: { groups: PlacedGroup[] }) {
  return (
    <>
      {groups.map((g) => (
        <div
          key={g.id}
          data-testid="map-group"
          style={{ left: g.x, top: g.y, width: g.width, height: g.height }}
          className="pointer-events-none absolute rounded-[18px] border-[1.25px] border-dashed border-[color:var(--jd-ink)]/32"
        >
          <span className="absolute left-3 top-1.5 max-w-full truncate pr-6 text-[10px] font-bold uppercase tracking-[0.14em] text-[color:var(--jd-ink)]/55">{g.label}</span>
        </div>
      ))}
    </>
  );
}
