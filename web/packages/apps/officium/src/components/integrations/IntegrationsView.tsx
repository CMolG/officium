"use client";

import { Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { useCopy } from "../../lib/i18n/use-copy";
import { ConnectAgentPanel } from "../connect/ConnectAgentPanel";
import { ConfigPage } from "../configuration/ConfigPage";
import { ProjectIntegrations } from "./ProjectIntegrations";
import { IS_LOCAL } from "../../lib/edition";
import { CloudLocked } from "../cloud/CloudLocked";

/**
 * Configuration > Integrations (JAVA-1629): the project's GitHub repositories and Documentation changelog first, the
 * account's agent connection last (JAVA-1663). The sections are independent: each owns its loading and error states,
 * so a failed GitHub read never hides the agent connection.
 */
export function IntegrationsView({ projectId, endpoint }: { projectId: string | null; endpoint: string }) {
  const copy = useCopy().configuration;

  return (
    <ConfigPage title={copy.sections.integrations} lede={copy.integrations.lede}>
      {IS_LOCAL ? (
        <CloudLocked feature="github" />
      ) : projectId ? (
        <ProjectIntegrations key={projectId} projectId={projectId} />
      ) : (
        <section className="flex flex-col gap-2" aria-labelledby="github-heading">
          <h2 id="github-heading" className="text-base font-bold">
            {copy.integrations.githubHeading}
          </h2>
          <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
            {copy.integrations.githubNoProject}
          </Text>
          <Link href="/app" className="flex min-h-11 w-fit flex-row items-center text-sm font-medium underline underline-offset-2">
            {copy.goToProjects}
          </Link>
        </section>
      )}

      <ConnectAgentPanel endpoint={endpoint} />
    </ConfigPage>
  );
}
