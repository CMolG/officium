import type { Metadata } from "next";

import { IntegrationsView } from "@/components/integrations/IntegrationsView";
import { mcpEndpoint } from "@/lib/connect/mcp-endpoint";

export const metadata: Metadata = {
  title: "Officium — Integrations",
};

export default async function IntegrationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <IntegrationsView projectId={projectId} endpoint={await mcpEndpoint()} />;
}
