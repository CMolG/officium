"use client";

import type { ReactNode } from "react";
import { Link } from "@javadaba/ui/navigation";
import { Button } from "@javadaba/ui";

import { PIPELINE_SECTION_ID, configurationPath } from "../../lib/configuration/places";

/** The owner's button: it lands on the Documentation changelog section of Integrations (JAVA-1663). */
export function PipelineConnectLink({ projectId, children }: { projectId: string; children: ReactNode }) {
  return (
    <Button asChild register="ui" size="sm" variant="outline">
      <Link href={`${configurationPath("integrations", projectId)}#${PIPELINE_SECTION_ID}`}>{children}</Link>
    </Button>
  );
}
