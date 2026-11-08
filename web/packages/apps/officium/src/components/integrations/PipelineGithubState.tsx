"use client";

import { Text } from "@javadaba/ui";

import type { GithubRepositoriesState } from "../settings/use-github-repositories";

/** The GitHub block's state, read from the same read the GitHub section above shows. */
export function PipelineGithubState({ github }: { github: GithubRepositoriesState }) {
  const { load } = github;
  const repos = load.state === "ready" ? load.value.connected.map((repo) => repo.repo) : [];
  let text = "Checking GitHub…";
  if (load.state === "error") {
    text = load.ownerOnly
      ? "Only the project's owner sees which repositories are connected."
      : "Couldn't check which repositories are connected.";
  } else if (load.state === "ready") {
    text =
      repos.length > 0
        ? `Connected: ${repos.join(", ")}. Its next merge to the default branch will show up here.`
        : "No repository is connected yet.";
  }
  return (
    <Text as="p" data-testid="pipeline-github-state" className="break-words text-sm">
      {text}
    </Text>
  );
}
