import type { Metadata } from "next";

import { WorkProfileSurface } from "@/components/profiles/WorkProfileSurface";

export const metadata: Metadata = {
  title: "Officium - Work Profile",
};

export default async function RolesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <WorkProfileSurface projectId={projectId} />;
}
