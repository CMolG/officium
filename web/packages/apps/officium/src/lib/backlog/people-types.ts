// People and team wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.
import type { ProjectColor, Role } from "./types";

/** An organization's nicknames (JAVA-199): Officium's own, unique there regardless of case. An
 *  agent writes as "Claude Code (nickname)". */
export interface Nicknames {
  organizationId: string;
  mine: string | null;
  nicknames: { accountId: string; nickname: string }[];
}

/** The organization's label and its owner, for the Organization page (JAVA-1780). The caller is always the owner. */
export interface OrganizationProfile {
  id: string;
  name: string;
  owner: { accountId: string; name: string; email: string };
}

/** Officium's own team (officium-api.md §8.5): a grant of `editor`/`viewer` on the owner's
 *  projects. `contexts/iam`'s `Organization` is the account, not a group of people -- teams are
 *  Officium's, owned by an account, and only their owner reads or changes one. */
export type TeamRole = "editor" | "viewer";

export interface TeamMember {
  accountId: string;
  email: string;
  name: string;
  addedAt: string;
}

export interface TeamProjectGrant {
  projectId: string;
  name: string;
  keyPrefix: string;
  icon: string;
  iconColor: ProjectColor;
  role: TeamRole;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
  projects: TeamProjectGrant[];
}

export interface PersonProject {
  projectId: string;
  name: string;
  keyPrefix: string;
  role: Role;
  via: "direct" | "team";
  teamId: string | null;
}

/** The collaborators an owner has across all their projects, against the cap they include (JAVA-1009). */
export interface CollaboratorQuota {
  used: number;
  cap: number;
}

/** Everyone with access to a project the caller owns, excluding the caller. */
export interface Person {
  accountId: string;
  email: string;
  name: string;
  projects: PersonProject[];
  teams: { id: string; name: string }[];
}
