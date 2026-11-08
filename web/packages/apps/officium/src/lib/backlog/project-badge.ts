import type { Project } from "./types";

/**
 * What the project badge shows. `loading`: the list is not in yet and the page has no project to show. `static`: a
 * plain label, no control (fewer than two projects to choose from, or nothing to choose from yet). `switchable`: the
 * selector. `unavailable`: the list came back empty while the project in view is live, so the badge says so and offers
 * Try again.
 */
export type ProjectBadgeState = "loading" | "static" | "switchable" | "unavailable";

/** The projects the badge offers: the live ones, plus the project in view when it is archived. No duplicates. */
export function badgeProjects(projects: Project[], current: Project | null): Project[] {
  const live = projects.filter((p) => p.archivedAt === null);
  if (!current || current.archivedAt === null || live.some((p) => p.id === current.id)) return live;
  return [...live, current];
}

/** The badge's state, from the shared project list (`null` until its first load) and the project the page shows. */
export function projectBadgeState(list: Project[] | null, current: Project | null): ProjectBadgeState {
  if (list === null) return current ? "static" : "loading";
  if (list.length === 0) return current && current.archivedAt === null ? "unavailable" : "static";
  return badgeProjects(list, current).length >= 2 ? "switchable" : "static";
}
