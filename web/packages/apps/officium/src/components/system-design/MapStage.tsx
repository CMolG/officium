"use client";

import { useEffect, useRef, useState } from "react";
import { DabaCanvas } from "@javadaba/ui/canvas";
import { Maximize2, Minus, Plus } from "lucide-react";
import { Button, Text } from "@javadaba/ui";

import { layoutSystem } from "../../lib/system-design/layout";
import type { SystemModel } from "../../lib/system-design/types";
import { MapEdges } from "./MapEdges";
import { MapGroups } from "./MapGroups";
import { MapNode } from "./MapNode";
import { NodePanel } from "./NodePanel";
import { remOf, useMapControls, vetoPlainDrag } from "./use-map-controls";

const ZOOM_BUTTON = "size-11 bg-[color:var(--jd-raised)]";

/** Doc-Systema's ground: the page color under a 22 px dot grid at 14% ink. */
const MAP_GROUND = {
  color: "var(--jd-ink)",
  backgroundColor: "var(--jd-page)",
  backgroundImage: "radial-gradient(color-mix(in srgb, var(--jd-ink) 14%, transparent) 1px, transparent 1.2px)",
  backgroundSize: "22px 22px",
} as const;

export function MapStage({ model }: { model: SystemModel }) {
  const box = useRef<HTMLDivElement>(null);
  // The layout is in rem (the engine's world is px): measured once the box exists, so the first paint is empty.
  const [rem, setRem] = useState<number | null>(null);
  useEffect(() => {
    if (box.current) setRem(remOf(box.current));
  }, []);
  const layout = rem === null ? null : layoutSystem(model, rem);
  const controls = useMapControls(box, layout);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = model.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <div ref={box} className="relative min-h-96 min-w-0 flex-1 touch-none overflow-hidden border-y border-[color:var(--jd-line)] md:border-y-0 md:border-r">
        <DabaCanvas
          className="h-full w-full"
          style={MAP_GROUND}
          shouldHandleBackgroundGesture={vetoPlainDrag}
          rootProps={{
            tabIndex: 0,
            role: "application",
            "aria-label": `System map, ${model.nodes.length} nodes and ${model.edges.length} connections. Arrow keys move, plus and minus zoom, 0 fits.`,
            className: "cursor-grab outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--jd-ink)]",
            "data-testid": "system-map",
          }}
        >
          {layout && rem !== null && (
            <>
              <MapGroups groups={layout.groups} />
              <MapEdges edges={layout.edges} selectedId={selectedId} />
              {layout.nodes.map((placed) => (
                <MapNode key={placed.node.id} placed={placed} selected={placed.node.id === selectedId} onSelect={() => setSelectedId(placed.node.id === selectedId ? null : placed.node.id)} />
              ))}
            </>
          )}
        </DabaCanvas>
        <div data-map-control className="absolute bottom-3 right-3 flex flex-row gap-1.5">
          <Button type="button" register="ui" variant="outline" size="icon" className={ZOOM_BUTTON} aria-label="Zoom out" onClick={controls.zoomOut}>
            <Minus size={16} aria-hidden="true" />
          </Button>
          <Button type="button" register="ui" variant="outline" size="icon" className={ZOOM_BUTTON} aria-label="Zoom in" onClick={controls.zoomIn}>
            <Plus size={16} aria-hidden="true" />
          </Button>
          <Button type="button" register="ui" variant="outline" size="icon" className={ZOOM_BUTTON} aria-label="Fit the map" onClick={controls.fit}>
            <Maximize2 size={16} aria-hidden="true" />
          </Button>
        </div>
        <Text className="pointer-events-none absolute bottom-3 left-3 hidden max-w-[60%] text-xs text-[color:var(--jd-muted)] sm:block">
          Drag to move around. Ctrl or Cmd and scroll to zoom.
        </Text>
      </div>
      {selected && <NodePanel model={model} node={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
