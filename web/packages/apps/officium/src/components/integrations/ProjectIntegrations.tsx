"use client";

import { GithubSettingsView } from "../settings/GithubSettingsView";
import { useGithubRepositories } from "../settings/use-github-repositories";
import { PipelineSection } from "./PipelineSection";

/**
 * The project's part of Integrations (JAVA-1663): its GitHub repositories and its Documentation changelog. One
 * GitHub read serves both, so connecting a repository above changes the pipeline's line at once. The page keys it
 * by project, so a token shown once never follows the selector to another project.
 */
export function ProjectIntegrations({ projectId }: { projectId: string }) {
  const github = useGithubRepositories(projectId);
  return (
    <>
      <GithubSettingsView projectId={projectId} github={github} />
      <PipelineSection projectId={projectId} project={github.project} github={github} />
    </>
  );
}
