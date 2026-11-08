import type { Metadata } from "next";

import { SystemDesignView } from "@/components/system-design/SystemDesignView";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Officium — System design",
};

export default async function SystemDesignPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SystemDesignView projectId={projectId} />;
}
