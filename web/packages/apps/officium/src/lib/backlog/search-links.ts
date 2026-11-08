/** The board's address (JAVA-1417). */
export function boardPath(projectId: string): string {
  return `/app/p/${projectId}`;
}

/** A card's own page (JAVA-1417, JAVA-1567): the card filling the work canvas. The key is the canonical, upper-case one. */
export function cardPath(projectId: string, key: string): string {
  return `/app/p/${projectId}/${encodeURIComponent(key.toUpperCase())}`;
}

/** The search view's address, optionally opened on a query. */
export function searchPath(projectId: string, jql?: string): string {
  return `/app/p/${projectId}/search${jql ? `?jql=${encodeURIComponent(jql)}` : ""}`;
}

/** The backlog view's address (JAVA-54): sprint planning, one level below the board. */
export function backlogPath(projectId: string): string {
  return `/app/p/${projectId}/backlog`;
}

/** The contributions view's address (JAVA-55/56), which also folds in the old `/report` route's
 *  printable time report (JAVA-52 fold, `?tab=report`). */
export function contributionsPath(projectId: string): string {
  return `/app/p/${projectId}/contributions`;
}

/** The documentation view's address (JAVA-131), optionally on one page (`procedures/deploy`). */
export function docsPath(projectId: string, path?: string): string {
  return `/app/p/${projectId}/docs${path ? `/${path}` : ""}`;
}

/** `docsPath` read back from the address: the page's path, or null at the docs root (JAVA-1536). */
export function docPathOf(pathname: string, projectId: string): string | null {
  const root = docsPath(projectId);
  if (!pathname.startsWith(`${root}/`)) return null;
  const path = pathname.slice(root.length + 1).split("/").filter(Boolean).map(decodeURIComponent).join("/");
  return path || null;
}

/**
 * "View completed": the cards verified in production, newest first. Completed has no column on the
 * board (user decision, 2026-09-23), so this is the one way to them.
 */
export const COMPLETED_JQL = "status = Completed ORDER BY updated DESC";

/**
 * "View rejected" (card://JAVA-1415): the discarded cards, newest first, kept with why. Rejected has
 * no column either, so this is the one way to them.
 */
export const REJECTED_JQL = "status = Rejected ORDER BY updated DESC";

/**
 * The search view's saved filters, Jira's left-hand list. Written as queries, not as code paths:
 * choosing one only fills the query box, so it is also a way to learn the language.
 */
export const SAVED_FILTERS: readonly { id: string; label: string; jql: string }[] = [
  { id: "open", label: "Open cards", jql: "status not in (Deploy, Completed, Rejected) ORDER BY priority DESC" },
  {
    id: "mine",
    label: "Assigned to me",
    jql: "assignee = currentUser() AND status not in (Deploy, Completed, Rejected) ORDER BY priority DESC",
  },
  { id: "deploy", label: "Waiting for deploy", jql: "status = Deploy ORDER BY updated DESC" },
  { id: "completed", label: "Completed", jql: COMPLETED_JQL },
  { id: "rejected", label: "Rejected", jql: REJECTED_JQL },
  { id: "sentBack", label: "Sent back", jql: "sentBack > 0 ORDER BY updated DESC" },
  { id: "blocked", label: "Blocked", jql: "blocked = true ORDER BY priority DESC" },
  { id: "agents", label: "Agents at work", jql: 'executor = ai AND status in ("In progress", Review) ORDER BY updated DESC' },
  { id: "recent", label: "Updated this week", jql: "updated >= -7d ORDER BY updated DESC" },
];
