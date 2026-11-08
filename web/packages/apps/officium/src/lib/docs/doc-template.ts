/**
 * A template's two rules, the server's `DocTemplate` mirrored (JAVA-801, design §6): the collection its
 * path puts it in, and what a page made from it reads, its variables filled. The server writes that
 * page; this previews it, so the title a person sees before creating is the one the server writes.
 */
const VARIABLE = /\{(datetime|date|time|author)\}/g;

/** The collection a template at `path` belongs to: its first segment, or null at depth 1 (the project's). */
export function templateCollection(path: string): string | null {
  const slash = path.indexOf("/");
  return slash < 0 ? null : path.slice(0, slash);
}

/** Where "Make a template" puts a page's template by default: `<collection>/<slug>-template`, or `<slug>-template` at depth 1. */
export function templatePathFor(pagePath: string): string {
  const slug = `${pagePath.slice(pagePath.lastIndexOf("/") + 1)}-template`;
  const collection = templateCollection(pagePath);
  return collection ? `${collection}/${slug}` : slug;
}

/** The caller's own zone: the fill is dated where they are, not where the server is. */
export function callerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Whether the platform can read `timeZone`; the server refuses one it can't (`invalid_time_zone`). */
export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

function stamp(at: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, time: `${part("hour")}:${part("minute")}` };
}

/**
 * `text` with `{date}` (2026-10-13), `{time}` (15:42), `{datetime}` (2026-10-13 15:42) and `{author}` filled,
 * ISO like every date the page schema writes. Any other `{…}` stays as written, and nothing filled is filled again.
 */
export function fillTemplate(text: string, at: Date, timeZone: string, author: string): string {
  const { date, time } = stamp(at, timeZone);
  const values: Record<string, string> = { date, time, datetime: `${date} ${time}`, author };
  return text.replace(VARIABLE, (_match, name: string) => values[name]);
}
