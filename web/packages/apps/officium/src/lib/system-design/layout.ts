import type { SystemModel, SystemNode } from "./types";

/**
 * The map's geometry, in rem (the owner's rule: no hard-coded px). `NODE_W` and `NODE_H` are the
 * card's `w-52` and `h-20`; `layoutSystem` multiplies by the root font size, because the canvas
 * engine places things in world units (px) and the cards are sized in rem.
 */
export const NODE_W = 13;
export const NODE_H = 5;
const COL_GAP = 6;
const ROW_GAP = 1.5;
const PAD = 1.25;
const HEAD = 2;
const BAND_GAP = 2.5;
const DROP = 3;

export interface PlacedNode {
  node: SystemNode;
  x: number;
  y: number;
  width: number;
  height: number;
  rank: number;
}

export interface PlacedGroup {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedEdge {
  key: string;
  from: string;
  to: string;
  label?: string;
  d: string;
  labelAt: { x: number; y: number };
  /** Runs against the flow (a cycle): drawn under the cards instead of between the columns. */
  back: boolean;
}

export interface SystemLayout {
  nodes: PlacedNode[];
  groups: PlacedGroup[];
  edges: PlacedEdge[];
  width: number;
  height: number;
}

/** Edge indexes that close a cycle, found by a depth-first walk from the sources in node order. */
function backEdges(model: SystemModel): Set<number> {
  const out = new Map<string, { to: string; i: number }[]>();
  const hasIn = new Set<string>();
  model.edges.forEach((e, i) => {
    out.set(e.from, [...(out.get(e.from) ?? []), { to: e.to, i }]);
    hasIn.add(e.to);
  });
  const state = new Map<string, 1 | 2>();
  const back = new Set<number>();
  const visit = (id: string) => {
    state.set(id, 1);
    for (const { to, i } of out.get(id) ?? []) {
      const s = state.get(to);
      if (s === 1) back.add(i);
      else if (s === undefined) visit(to);
    }
    state.set(id, 2);
  };
  const ids = model.nodes.map((n) => n.id);
  for (const id of [...ids.filter((n) => !hasIn.has(n)), ...ids]) if (!state.has(id)) visit(id);
  return back;
}

/** Longest path from a source, ignoring the edges that close a cycle. */
export function rankNodes(model: SystemModel, back: Set<number>): Map<string, number> {
  const preds = new Map<string, string[]>();
  model.edges.forEach((e, i) => {
    if (!back.has(i)) preds.set(e.to, [...(preds.get(e.to) ?? []), e.from]);
  });
  const ranks = new Map<string, number>();
  const rankOf = (id: string): number => {
    const known = ranks.get(id);
    if (known !== undefined) return known;
    const rank = Math.max(-1, ...(preds.get(id) ?? []).map(rankOf)) + 1;
    ranks.set(id, rank);
    return rank;
  };
  model.nodes.forEach((n) => rankOf(n.id));
  return ranks;
}

function edgePath(a: PlacedNode, b: PlacedNode, back: boolean, rem: number) {
  if (!back && b.x > a.x + a.width) {
    const x1 = a.x + a.width;
    const y1 = a.y + a.height / 2;
    const y2 = b.y + b.height / 2;
    const dx = (b.x - x1) / 2;
    return { d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${b.x - dx} ${y2}, ${b.x} ${y2}`, at: { x: (x1 + b.x) / 2, y: (y1 + y2) / 2 } };
  }
  const x1 = a.x + a.width / 2;
  const y1 = a.y + a.height;
  const x2 = b.x + b.width / 2;
  const y2 = b.y + b.height;
  const drop = DROP * rem;
  return { d: `M ${x1} ${y1} C ${x1} ${y1 + drop}, ${x2} ${y2 + drop}, ${x2} ${y2}`, at: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 + drop * 0.75 } };
}

/**
 * Layers by rank (x) and stacks within a rank (y). Each group gets its own horizontal band so the
 * boxes drawn around them can never overlap each other or another group's cards; the nodes with
 * no group form the last band, boxless. `rem` is the root font size in px.
 */
export function layoutSystem(model: SystemModel, rem: number): SystemLayout {
  const back = backEdges(model);
  const ranks = rankNodes(model, back);
  const w = NODE_W * rem;
  const h = NODE_H * rem;
  const pad = PAD * rem;
  const head = HEAD * rem;
  const bandGap = BAND_GAP * rem;
  const step = h + ROW_GAP * rem;

  const bands: { id: string | null; label: string; nodes: SystemNode[] }[] = model.groups
    .map((g) => ({ id: g.id as string | null, label: g.label, nodes: model.nodes.filter((n) => n.group === g.id) }))
    .filter((b) => b.nodes.length > 0);
  const loose = model.nodes.filter((n) => !n.group);
  if (loose.length > 0) bands.push({ id: null, label: "", nodes: loose });

  const placed = new Map<string, PlacedNode>();
  const groups: PlacedGroup[] = [];
  let cursor = 0;
  for (const band of bands) {
    const byRank = new Map<number, SystemNode[]>();
    band.nodes.forEach((n) => byRank.set(ranks.get(n.id)!, [...(byRank.get(ranks.get(n.id)!) ?? []), n]));
    const rows = Math.max(...[...byRank.values()].map((list) => list.length));
    const boxed = band.id !== null;
    const top = cursor + (boxed ? head + pad : 0);
    const left = (rank: number) => pad + rank * (w + COL_GAP * rem);
    byRank.forEach((list, rank) => {
      const inset = ((rows - list.length) * step) / 2;
      list.forEach((node, i) => placed.set(node.id, { node, x: left(rank), y: top + inset + i * step, width: w, height: h, rank }));
    });
    const bottom = top + rows * step - ROW_GAP * rem;
    if (boxed) {
      const rankList = [...byRank.keys()];
      const x = left(Math.min(...rankList)) - pad;
      groups.push({ id: band.id!, label: band.label, x, y: cursor, width: left(Math.max(...rankList)) + w + pad - x, height: bottom + pad - cursor });
    }
    cursor = bottom + (boxed ? pad : 0) + bandGap;
  }

  const edges: PlacedEdge[] = model.edges.map((e, i) => {
    const { d, at } = edgePath(placed.get(e.from)!, placed.get(e.to)!, back.has(i), rem);
    return { key: `${i}:${e.from}>${e.to}`, from: e.from, to: e.to, label: e.label, d, labelAt: at, back: back.has(i) };
  });
  const nodes = model.nodes.map((n) => placed.get(n.id)!);
  const right = Math.max(...nodes.map((n) => n.x + n.width), ...groups.map((g) => g.x + g.width));
  return { nodes, groups, edges, width: right + pad, height: Math.max(0, cursor - bandGap) + pad + (back.size > 0 ? DROP * rem : 0) };
}
