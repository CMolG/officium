import type { Actor, ChangeEvent, DocPage } from "../backlog/types";

/**
 * What a screen reader hears when a re-read brings a newer version someone else wrote -- an agent
 * always counts, a person only when they are not you -- or null for your own save and for no change.
 */
export function announcementFor(shown: DocPage | null, next: DocPage, me: string | undefined): string | null {
  if (shown === null || next.version <= shown.version) return null;
  const by: Actor = next.updatedBy;
  if (by.kind === "person" && by.accountId === me) return null;
  return `Page updated just now by ${by.kind === "agent" ? `${by.agentName ?? by.name} (agent)` : by.name}`;
}

/**
 * Whether an open page re-reads itself on a live event (JAVA-802, §4). A reconnection does, and so
 * does a `doc.changed` from an older server that names no path: the page must never miss a change.
 * Otherwise only an event for THIS page, with no version (a delete, a node write) or a newer one than
 * the page shows -- which is also how its own save's echo is skipped.
 */
export function shouldReread(event: ChangeEvent, path: string, shownVersion: number | null): boolean {
  if (event.type === "stream.ready") return true;
  if (event.type !== "doc.changed") return false;
  if (event.path === undefined) return true;
  if (event.path !== path) return false;
  return event.version === undefined || shownVersion === null || event.version > shownVersion;
}
