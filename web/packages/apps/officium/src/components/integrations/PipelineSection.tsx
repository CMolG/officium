"use client";

import { Text } from "@javadaba/ui";

import type { Project } from "../../lib/backlog/types";
import { PIPELINE_SECTION_ID } from "../../lib/configuration/places";
import { useCopy } from "../../lib/i18n/use-copy";
import type { GithubRepositoriesState } from "../settings/use-github-repositories";
import { PipelineGithubState } from "./PipelineGithubState";
import { PipelineTokenBlock } from "./PipelineTokenBlock";
import { usePipelineToken } from "./use-pipeline-token";

/**
 * How the changelog fills (JAVA-132, officium-api.md §8.8), in the order a person should try: a connected
 * GitHub repository first (JAVA-1565), test runs from the computers connected as agents, and last the
 * pipeline token for any other CI. It replaces the "Connect your pipeline" dialog (JAVA-1663): the token is
 * shown once, here, and only its hash is kept, so losing it means creating another.
 */
export function PipelineSection({
  projectId,
  project,
  github,
}: {
  projectId: string;
  project: Project | null;
  github: GithubRepositoriesState;
}) {
  const copy = useCopy().configuration.integrations;
  const token = usePipelineToken(projectId);

  return (
    <section id={PIPELINE_SECTION_ID} aria-labelledby="documentation-changelog-heading" className="flex scroll-mt-6 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 id="documentation-changelog-heading" className="text-lg font-bold">
          <Text>{copy.pipelineHeading}</Text>
          {project ? <Text className="font-medium text-[color:var(--jd-muted)]">{` · ${project.name}`}</Text> : null}
        </h2>
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          {copy.pipelineScope}
        </Text>
      </div>

      <section aria-labelledby="pipeline-github" className="flex flex-col gap-2">
        <h3 id="pipeline-github" className="text-sm font-semibold">
          Connect a GitHub repository
        </h3>
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          Connect a GitHub repository and every merge to its default branch records itself here, waiting for someone to
          check the docs. Nothing to install and nothing to paste. Connect and manage them in GitHub repositories, above.
        </Text>
        <PipelineGithubState github={github} />
      </section>

      <section aria-labelledby="pipeline-tests" className="flex flex-col gap-2">
        <h3 id="pipeline-tests" className="text-sm font-semibold">
          Test runs
        </h3>
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          Test runs are recorded from the computers you connected as agents in Connect an agent, below. Nothing to paste:
          each run uses that computer&apos;s own token.
        </Text>
      </section>

      <PipelineTokenBlock project={project} token={token} />
    </section>
  );
}
