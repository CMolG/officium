import { AppWindow, Cog, Database, Globe, ListEnd, Server } from "lucide-react";

import type { NodeKind } from "../../lib/system-design/types";

/**
 * An icon, a word and a tint per kind: the kind is never said by color alone (Doc-Systema, "Six kinds of node"). The
 * tints are the board's own pastels, light enough that the ink icon on them passes 4.5:1 in any theme: the chip keeps
 * its tint on the dark desktop, where the icon is drawn in the fixed ink below.
 */
export const KINDS: Record<NodeKind, { icon: typeof Server; word: string; tint: string }> = {
  app: { icon: AppWindow, word: "App", tint: "var(--officium-kind-app)" },
  service: { icon: Cog, word: "Service", tint: "var(--officium-kind-service)" },
  database: { icon: Database, word: "Database", tint: "var(--officium-kind-database)" },
  queue: { icon: ListEnd, word: "Queue", tint: "var(--officium-kind-queue)" },
  server: { icon: Server, word: "Server", tint: "var(--officium-kind-server)" },
  external: { icon: Globe, word: "External", tint: "var(--officium-kind-external)" },
};

/** The ink on a kind's tint: the same black in every theme, because the tint does not change with it. */
export const KIND_INK = "var(--officium-kind-ink)";
