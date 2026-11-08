import type { JqlValue } from "./jql";

/** A date value as an instant range: `[from, to)`. A bare day covers the whole day. */
export function parseDateValue(v: JqlValue, now: Date): { from: number; to: number } | null {
  if (v.fn === "now") return { from: now.getTime(), to: now.getTime() + 1 };
  if (v.fn === "startOfDay" || v.fn === "startOfWeek") {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    if (v.fn === "startOfWeek") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return { from: d.getTime(), to: d.getTime() + 1 };
  }
  const relative = /^([+-]?)(\d+)([mhdw])$/i.exec(v.raw);
  if (relative) {
    const unit = { m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 }[relative[3].toLowerCase() as "m"];
    const at = now.getTime() + (relative[1] === "+" ? 1 : -1) * Number(relative[2]) * unit;
    return { from: at, to: at + 1 };
  }
  const day = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(v.raw);
  if (day) {
    const from = new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])).getTime();
    return Number.isNaN(from) ? null : { from, to: from + 86_400_000 };
  }
  return null;
}
