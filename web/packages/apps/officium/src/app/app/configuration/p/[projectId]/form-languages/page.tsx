import type { Metadata } from "next";

import { FormLanguagesView } from "@/components/settings/FormLanguagesView";

export const metadata: Metadata = {
  title: "Officium — Form languages",
};

export default async function FormLanguagesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <FormLanguagesView projectId={projectId} />;
}
