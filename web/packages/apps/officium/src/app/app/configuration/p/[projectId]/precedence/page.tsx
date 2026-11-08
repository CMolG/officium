import type { Metadata } from "next";

import { PrecedenceView } from "@/components/configuration/precedence/PrecedenceView";

export const metadata: Metadata = {
  title: "Officium — Precedence",
};

export default async function PrecedencePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <PrecedenceView projectId={projectId} />;
}
