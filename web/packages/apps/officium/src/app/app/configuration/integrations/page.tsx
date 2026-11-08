import type { Metadata } from "next";

import { IntegrationsResolver } from "@/components/integrations/IntegrationsResolver";
import { mcpEndpoint } from "@/lib/connect/mcp-endpoint";

export const metadata: Metadata = {
  title: "Officium — Integrations",
};

export default async function IntegrationsPage() {
  return <IntegrationsResolver endpoint={await mcpEndpoint()} />;
}
