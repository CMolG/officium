// A line diff for comparing a kept version with the current one (JAVA-794). Myers' O(ND) greedy
// algorithm over lines; pages are small, so the whole trace is kept to walk back.

export type DiffKind = "same" | "add" | "remove";

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

export interface LineDiff {
  lines: DiffLine[];
  added: number;
  removed: number;
}

/** What turns `before` into `after`, line by line: `remove` lines are only in `before`, `add` only in `after`. */
export function lineDiff(before: string, after: string): LineDiff {
  const a = before === "" ? [] : before.split("\n");
  const b = after === "" ? [] : after.split("\n");
  const max = a.length + b.length;
  const offset = max;
  const v = new Array<number>(2 * max + 2).fill(0);
  const trace: number[][] = [];
  let found = false;
  for (let d = 0; d <= max && !found; d++) {
    trace.push(v.slice());
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]) ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < a.length && y < b.length && a[x] === b[y]) {
        x++;
        y++;
      }
      v[offset + k] = x;
      if (x >= a.length && y >= b.length) {
        found = true;
        break;
      }
    }
  }
  const lines: DiffLine[] = [];
  let x = a.length;
  let y = b.length;
  for (let d = trace.length - 1; d >= 0; d--) {
    const snapshot = trace[d];
    const k = x - y;
    const prevK = k === -d || (k !== d && snapshot[offset + k - 1] < snapshot[offset + k + 1]) ? k + 1 : k - 1;
    const prevX = snapshot[offset + prevK];
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      lines.push({ kind: "same", text: a[x - 1] });
      x--;
      y--;
    }
    if (d > 0) {
      if (x === prevX) lines.push({ kind: "add", text: b[y - 1] });
      else lines.push({ kind: "remove", text: a[x - 1] });
    }
    x = prevX;
    y = prevY;
  }
  lines.reverse();
  return {
    lines,
    added: lines.filter((l) => l.kind === "add").length,
    removed: lines.filter((l) => l.kind === "remove").length,
  };
}
