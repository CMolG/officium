import type { Metadata } from "next";

import { DocSettingsView } from "@/components/settings/DocSettingsView";

export const metadata: Metadata = {
  title: "Officium — Documentation history",
};

export default async function DocSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <DocSettingsView projectId={projectId} />;
}
