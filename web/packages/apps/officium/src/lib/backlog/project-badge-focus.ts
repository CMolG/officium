/**
 * Where focus goes after a project switch. A route change remounts the page, so focus would otherwise fall to the body
 * (WCAG 2.4.3): the badge picked from says the project it is now on, and the new page's badge takes focus on mount.
 * It is not cleared on the first read: a page can mount its badge more than once while it loads (a skeleton, then the
 * ready page), and each new one should take focus until the window closes. A `const` object and module functions, not a
 * module `let`: the React Compiler reorders a read-and-clear of a `let`.
 */
const HANDOFF = { projectId: null as string | null, until: 0 };

/** How long a hand-off waits for the new page to mount before it is dropped. */
const WINDOW_MS = 5000;

export function expectBadgeFocus(projectId: string): void {
  HANDOFF.projectId = projectId;
  HANDOFF.until = Date.now() + WINDOW_MS;
}

/** Whether a badge of `projectId` should take focus now: a hand-off to it is still inside its window. */
export function badgeFocusPending(projectId: string): boolean {
  return HANDOFF.projectId === projectId && Date.now() < HANDOFF.until;
}
