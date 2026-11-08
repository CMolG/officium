import { NODE_KINDS, type ParseResult, type Problem, type SystemEdge, type SystemGroup, type SystemModel, type SystemNode } from "./types";

const FENCE = /(?:^|\n)[ \t]*```system-design[^\n]*\n([\s\S]*?)\n[ \t]*```/;

/** The text of the first ```system-design block, or null when the page has none. */
export function findBlock(body: string): string | null {
  return FENCE.exec(body.replace(/\r\n/g, "\n"))?.[1] ?? null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

function readGroups(raw: unknown, problems: Problem[]): SystemGroup[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    problems.push({ path: "groups", message: `"groups" must be a list.` });
    return [];
  }
  const groups: SystemGroup[] = [];
  raw.forEach((item, i) => {
    const id = isRecord(item) ? text(item.id) : null;
    const label = isRecord(item) ? text(item.label) : null;
    if (!id || !label) {
      problems.push({ path: `groups[${i}]`, message: `Group ${i + 1} needs an "id" and a "label".` });
    } else if (groups.some((g) => g.id === id)) {
      problems.push({ path: `groups[${i}]`, message: `Two groups share the id "${id}".` });
    } else groups.push({ id, label });
  });
  return groups;
}

function readNode(item: unknown, i: number, groups: SystemGroup[], problems: Problem[]): SystemNode | null {
  const path = `nodes[${i}]`;
  const id = isRecord(item) ? text(item.id) : null;
  if (!isRecord(item) || !id) {
    problems.push({ path, message: `Node ${i + 1} needs an "id".` });
    return null;
  }
  const label = text(item.label);
  if (!label) problems.push({ path, message: `Node "${id}" needs a "label".` });
  const kind = NODE_KINDS.find((k) => k === item.kind);
  if (!kind) {
    problems.push({ path, message: `Node "${id}" has the kind ${JSON.stringify(item.kind ?? null)}; use one of ${NODE_KINDS.join(", ")}.` });
  }
  const group = item.group === undefined ? undefined : (text(item.group) ?? "");
  if (group !== undefined && !groups.some((g) => g.id === group)) {
    problems.push({ path, message: `Node "${id}" is in the group "${group}", but no group has that id.` });
  }
  const description = typeof item.description === "string" && item.description.trim() ? item.description.trim() : undefined;
  return label && kind ? { id, label, kind, group: group || undefined, description } : null;
}

function readEdges(raw: unknown, ids: Set<string>, problems: Problem[]): SystemEdge[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    problems.push({ path: "edges", message: `"edges" must be a list.` });
    return [];
  }
  const edges: SystemEdge[] = [];
  raw.forEach((item, i) => {
    const path = `edges[${i}]`;
    const from = isRecord(item) ? text(item.from) : null;
    const to = isRecord(item) ? text(item.to) : null;
    if (!isRecord(item) || !from || !to) {
      problems.push({ path, message: `Edge ${i + 1} needs a "from" and a "to".` });
      return;
    }
    if (!ids.has(from)) problems.push({ path, message: `Edge ${i + 1} starts at "${from}", but no node has that id.` });
    else if (!ids.has(to)) problems.push({ path, message: `Edge ${i + 1} goes to "${to}", but no node has that id.` });
    else if (from === to) problems.push({ path, message: `Edge ${i + 1} connects "${from}" to itself.` });
    else edges.push({ from, to, label: text(item.label) ?? undefined });
  });
  return edges;
}

/** Reads the page body: the first system-design block, checked. Pure; messages are plain English. */
export function parseSystemDesign(body: string): ParseResult {
  const block = findBlock(body);
  if (block === null) {
    return { ok: false, problems: [{ path: "", message: "The page has no system-design block. Add a code block whose language is system-design." }] };
  }
  let json: unknown;
  try {
    json = JSON.parse(block);
  } catch (err) {
    const why = err instanceof Error ? err.message : "it could not be read";
    return { ok: false, problems: [{ path: "", message: `The system-design block is not valid JSON: ${why}.` }] };
  }
  if (!isRecord(json)) {
    return { ok: false, problems: [{ path: "", message: "The system-design block must be an object with nodes, edges and groups." }] };
  }
  const problems: Problem[] = [];
  const groups = readGroups(json.groups, problems);
  const nodes: SystemNode[] = [];
  if (!Array.isArray(json.nodes) || json.nodes.length === 0) {
    problems.push({ path: "nodes", message: `The map needs a "nodes" list with at least one node.` });
  } else {
    json.nodes.forEach((item, i) => {
      const node = readNode(item, i, groups, problems);
      if (!node) return;
      if (nodes.some((n) => n.id === node.id)) problems.push({ path: `nodes[${i}]`, message: `Two nodes share the id "${node.id}".` });
      else nodes.push(node);
    });
  }
  const edges = readEdges(json.edges, new Set(nodes.map((n) => n.id)), problems);
  if (problems.length > 0) return { ok: false, problems };
  const model: SystemModel = { groups, nodes, edges };
  return { ok: true, model };
}
