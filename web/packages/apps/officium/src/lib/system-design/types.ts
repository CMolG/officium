/** The closed list of things a node can be (JAVA-58). The map draws an icon and says the word. */
export const NODE_KINDS = ["app", "service", "database", "queue", "server", "external"] as const;
export type NodeKind = (typeof NODE_KINDS)[number];

export interface SystemGroup {
  id: string;
  label: string;
}

export interface SystemNode {
  id: string;
  label: string;
  kind: NodeKind;
  group?: string;
  description?: string;
}

export interface SystemEdge {
  from: string;
  to: string;
  label?: string;
}

export interface SystemModel {
  groups: SystemGroup[];
  nodes: SystemNode[];
  edges: SystemEdge[];
}

/** One thing wrong with the block, in words a person can act on. `path` says where ("nodes[2]"). */
export interface Problem {
  path: string;
  message: string;
}

export type ParseResult = { ok: true; model: SystemModel } | { ok: false; problems: Problem[] };

/** The page the map is drawn from. */
export const SYSTEM_DESIGN_PATH = "system-design";
