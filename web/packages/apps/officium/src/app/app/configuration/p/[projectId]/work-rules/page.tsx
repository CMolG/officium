import type { Metadata } from "next";

import { WorkRulesView } from "@/components/settings/WorkRulesView";

export const metadata: Metadata = {
  title: "Officium — Work rules",
};

export default async function WorkRulesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <WorkRulesView projectId={projectId} />;
}
