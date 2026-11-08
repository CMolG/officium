// A three-way line merge for a write that reaches a co-edited page from outside its room (JAVA-1477,
// ADR 0024 § Saving rule 4). Built on `lineDiff`, with no dependency.

import { lineDiff } from "./line-diff";

export interface Merge3 {
  merged: string;
  /** Hunks of theirs left out because they changed the same lines as ours (or, with no base, every hunk). */
  overlaps: number;
}

/** A run of base lines [start, end) replaced by `lines`; a pure insertion has start === end. */
interface Hunk {
  start: number;
  end: number;
  lines: string[];
}

const split = (text: string) => (text === "" ? [] : text.split("\n"));

function hunks(before: string, after: string): Hunk[] {
  const out: Hunk[] = [];
  let at = 0;
  let open: Hunk | null = null;
  for (const line of lineDiff(before, after).lines) {
    if (line.kind === "same") {
      open = null;
      at++;
      continue;
    }
    open ??= (out[out.push({ start: at, end: at, lines: [] }) - 1] as Hunk);
    if (line.kind === "remove") {
      at++;
      open.end = at;
    } else open.lines.push(line.text);
  }
  return out;
}

const overlap = (a: Hunk, b: Hunk) => a.start === b.start || (a.start < b.end && b.start < a.end);
const sameHunk = (a: Hunk, b: Hunk) => a.start === b.start && a.end === b.end && a.lines.join("\n") === b.lines.join("\n");

/**
 * `base` is the text both sides started from (null when unknown), `ours` the room's text now and
 * `theirs` the outside write. A hunk only theirs changed is taken; where both changed the same lines
 * ours stays; the same change on both sides is taken once. With no base, ours stays whole.
 */
export function merge3(base: string | null, ours: string, theirs: string): Merge3 {
  if (ours === theirs) return { merged: ours, overlaps: 0 };
  if (base === null) return { merged: ours, overlaps: hunks(ours, theirs).length };
  const mine = hunks(base, ours);
  const taken = [...mine];
  let overlaps = 0;
  for (const hunk of hunks(base, theirs)) {
    if (mine.some((m) => sameHunk(m, hunk))) continue;
    if (mine.some((m) => overlap(m, hunk))) overlaps++;
    else taken.push(hunk);
  }
  taken.sort((a, b) => a.start - b.start || a.end - b.end);
  const lines = split(base);
  const out: string[] = [];
  let at = 0;
  for (const hunk of taken) {
    out.push(...lines.slice(at, hunk.start), ...hunk.lines);
    at = hunk.end;
  }
  out.push(...lines.slice(at));
  return { merged: out.join("\n"), overlaps };
}
