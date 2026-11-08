import type { CollaboratorQuota } from "./types";

/** What the Members dialog says about the owner's collaborators (JAVA-1009), in words, so the state
 *  never depends on colour. `full` is true at the cap and over it: a new person is refused then. */
export function describeQuota(quota: CollaboratorQuota): { line: string; full: boolean } {
  const { used, cap } = quota;
  if (used > cap) {
    return {
      line: `${used} collaborators; your account includes ${cap}. Nobody loses access, but adding people needs the Business plan.`,
      full: true,
    };
  }
  if (used === cap) {
    return {
      line: `${used} of ${cap} collaborators. More people need the Business plan. Remove someone to make room.`,
      full: true,
    };
  }
  return { line: `${used} of ${cap} collaborators`, full: false };
}

/** The refusal the server sends for a new person past the cap, word for word (`OfficiumException`
 *  `business_plan_required`), so the demo's refusal reads like the real one. */
export function collaboratorFullMessage(cap: number, used: number): string {
  return `Your account includes up to ${cap} collaborators across all your projects, and ${used} people already have access. More people need the Business plan. To make room now, remove someone.`;
}
