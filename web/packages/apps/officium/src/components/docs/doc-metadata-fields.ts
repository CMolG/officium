import { CalendarClock, CircleDot, Gauge, Info, Package, Shapes, Tag, UserRound, Users, type LucideIcon } from "lucide-react";
import type { BadgeTone } from "@javadaba/ui";

/** What each status other than `stable` tells the reader before they rely on the page. */
export const STATUS_NOTICES: Record<string, string> = {
  draft: "Draft: this page is still being written and may be incomplete.",
  beta: "Beta: what this page describes may still change.",
  deprecated: "Deprecated: what this page describes is being retired. Check its related pages for what replaces it.",
};

/** A status's tone; the badge always carries the word too, so the tone is never the only channel. */
export const STATUS_TONES: Record<string, BadgeTone> = { stable: "success", beta: "info", draft: "warning", deprecated: "danger" };

export type FieldKind = "text" | "badges" | "status" | "date";

/** The page schema's fields in its own order (`docs.schema`); `description` leads the page and `related` has its own
 *  list, so neither is a row. */
export const FIELDS: { key: string; label: string; icon: LucideIcon; kind: FieldKind }[] = [
  { key: "type", label: "Type", icon: Shapes, kind: "text" },
  { key: "status", label: "Status", icon: CircleDot, kind: "status" },
  { key: "audience", label: "Audience", icon: Users, kind: "badges" },
  { key: "level", label: "Level", icon: Gauge, kind: "text" },
  { key: "tags", label: "Tags", icon: Tag, kind: "badges" },
  { key: "product_version", label: "Product version", icon: Package, kind: "text" },
  { key: "owner", label: "Owner", icon: UserRound, kind: "text" },
  { key: "last_updated", label: "Last updated", icon: CalendarClock, kind: "date" },
];

/** A field the schema does not name keeps its own key as its label. */
export const OTHER_FIELD: { icon: LucideIcon; kind: FieldKind } = { icon: Info, kind: "text" };

export const KNOWN_KEYS = new Set([...FIELDS.map((f) => f.key), "description", "related", "title"]);

export const asList = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);

/** A `YYYY-MM-DD` as a reader says it ("Oct 2, 2026"); anything else as written. */
export function readableDate(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
