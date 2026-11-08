import { Text } from "@javadaba/ui";

import type { PlacedNode } from "../../lib/system-design/layout";
import { KindChip } from "./KindChip";
import { KINDS } from "./kinds";

/**
 * One node as a card (`w-52 h-20` is the layout's NODE_W by NODE_H in rem), drawn as Doc-Systema draws it: white, a
 * hairline, the kind's tinted chip and, beside it, the name and the kind in words. A button: it opens the side panel.
 * Selected is ink at 2.5 px with a dashed ring around it.
 */
export function MapNode({ placed, selected, onSelect }: { placed: PlacedNode; selected: boolean; onSelect: () => void }) {
  const { node } = placed;
  const { word } = KINDS[node.kind];
  return (
    <button
      type="button"
      data-map-node
      data-testid="map-node"
      data-node-id={node.id}
      aria-pressed={selected}
      onClick={onSelect}
      style={{ left: placed.x, top: placed.y }}
      className={`pointer-events-auto absolute flex h-20 w-52 flex-row items-center gap-3 rounded-[12px] border-[1.25px] bg-[color:var(--jd-raised)] px-3 text-left transition-colors hover:border-[color:var(--jd-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--jd-ink)] ${
        selected
          ? "border-[2.5px] border-[color:var(--jd-ink)] outline-1 outline-dashed outline-offset-[5px] outline-[color:var(--jd-ink)]/50"
          : "border-[color:var(--jd-ink)]/28"
      }`}
    >
      <KindChip kind={node.kind} />
      <span className="flex min-w-0 flex-1 flex-col">
        <Text className="line-clamp-2 text-[13px] font-bold leading-tight text-[color:var(--jd-ink)]">{node.label}</Text>
        <Text className="text-[10.5px] font-medium text-[color:var(--jd-muted)]">{word}</Text>
      </span>
    </button>
  );
}
