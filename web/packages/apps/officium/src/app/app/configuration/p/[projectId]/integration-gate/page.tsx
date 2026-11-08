import type { Metadata } from "next";

import { IntegrationGateView } from "@/components/configuration/gate/IntegrationGateView";

export const metadata: Metadata = {
  title: "Officium — Integration gate",
};

export default async function IntegrationGatePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <IntegrationGateView projectId={projectId} />;
}
