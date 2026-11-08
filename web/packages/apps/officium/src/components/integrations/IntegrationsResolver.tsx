"use client";

import { useEffect } from "react";
import { Text } from "@javadaba/ui";
import { useRouter } from "@javadaba/ui/navigation";

import { useCatalogProject } from "../../lib/backlog/use-mods";
import { configurationPath } from "../../lib/configuration/places";
import { useCopy } from "../../lib/i18n/use-copy";
import { IntegrationsView } from "./IntegrationsView";

/**
 * `/app/configuration/integrations`, the address with no project (JAVA-1629): the person's project's Integrations
 * when it has one, else the account's agent connection with the GitHub note. Until the project list answers it shows
 * only a status line, so the sections never mount twice.
 */
export function IntegrationsResolver({ endpoint }: { endpoint: string }) {
  const copy = useCopy().configuration;
  const router = useRouter();
  const projectId = useCatalogProject();

  useEffect(() => {
    if (projectId) router.replace(configurationPath("integrations", projectId));
  }, [projectId, router]);

  if (projectId === undefined || projectId) {
    return (
      <Text as="p" role="status" className="py-10 text-center text-sm text-[color:var(--jd-muted)]">
        {copy.loading}
      </Text>
    );
  }
  return <IntegrationsView projectId={null} endpoint={endpoint} />;
}
