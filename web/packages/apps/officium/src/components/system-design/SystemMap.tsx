"use client";

import { EngineProvider } from "@javadaba/ui/canvas";

import type { SystemModel } from "../../lib/system-design/types";
import { MapStage } from "./MapStage";

/** The map and, beside it (below on a phone), what the selected node is. Owns the engine's store. */
export function SystemMap({ model }: { model: SystemModel }) {
  return (
    <EngineProvider>
      <MapStage model={model} />
    </EngineProvider>
  );
}
