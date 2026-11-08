// GitHub link wire shapes, split from types.ts (JAVA-1386) to keep it under its architecture ceiling.

/** A commit, branch or pull request on GitHub that names the card (officium-api.md §8.10, JAVA-375).
 *  `ref` is the sha, the branch name or the PR number. */
export interface DevLink {
  kind: "commit" | "branch" | "pullRequest";
  repo: string;
  ref: string;
  url: string;
  title: string;
  author: string | null;
  state: "open" | "merged" | "closed";
  createdAt: string;
  updatedAt: string;
}

/** A GitHub repository the Officium App is installed on (officium-api.md §8.10), `owner/repo` lower-case. */
export interface GithubRepository {
  repo: string;
  installedAt: string;
  connectedAt: string | null;
}

/** The repositories feeding a project, and those the caller may connect: only what GitHub said, in
 *  the last day, their account reaches (JAVA-397). `authorizable` is false while the API has no
 *  GitHub client configured, so authorizing can't work. */
export interface GithubRepositories {
  connected: GithubRepository[];
  available: GithubRepository[];
  authorizable: boolean;
}
