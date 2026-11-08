import type { Metadata } from "next";

import { SharingView } from "@/components/configuration/sharing/SharingView";

export const metadata: Metadata = {
  title: "Officium — Sharing",
};

export default async function SharingPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SharingView projectId={projectId} />;
}
