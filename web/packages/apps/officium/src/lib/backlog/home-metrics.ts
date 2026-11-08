/**
 * What the projects home measures across projects and per project (Off-Home, "A dashboard, not a list"; the
 * owner decided the page is the entry point, so it shows more). The API serves none of these figures yet, so
 * each is one typed function that answers "unavailable" (`null`), and the page draws only what it was given:
 * never a number the server did not send.
 */

/** The four figures that need a measurement; "Waiting on you" is counted from what the page already loaded. */
export interface HomeFigures {
  /** Cards that reached Completed in the last seven days, and last week's for the delta. */
  doneThisWeek: { count: number; lastWeek: number } | null;
  /** Median days from To do to Deploy. */
  cycleDays: number | null;
  /** Share of this week's cards done by agents, 0..100. */
  doneByAgents: number | null;
  /** Hours logged in the active sprints, all projects. */
  hoursLogged: number | null;
}

/**
 * TODO(backend): `GET /metrics/home` returning `HomeFigures` for the caller's projects (done this week against
 * last, median cycle time To do to Deploy, the agents' share of done cards, hours logged this sprint). Until it
 * exists the page shows the one figure it can count itself.
 */
export async function loadHomeFigures(): Promise<HomeFigures> {
  return { doneThisWeek: null, cycleDays: null, doneByAgents: null, hoursLogged: null };
}

/** A project's tile glance: the sprint's progress, what is in progress and in review, the last seven days. */
export interface ProjectGlance {
  /** 0..100, null with no active sprint. */
  sprintPercent: number | null;
  doing: number;
  review: number;
  /** Cards done on each of the last seven days, oldest first. */
  doneLast7Days: number[];
}

/**
 * TODO(backend): `GET /projects/glance` returning `ProjectGlance` by project id: the active sprint's percent
 * done, the counts in In progress and Review, and cards done per day for seven days. A project missing from the
 * answer is "not served": its tile then shows its name, key and last update only.
 */
export async function loadProjectGlances(_projectIds: readonly string[]): Promise<Record<string, ProjectGlance>> {
  return {};
}
