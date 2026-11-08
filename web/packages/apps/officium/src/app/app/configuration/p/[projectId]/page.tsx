import { redirect } from "next/navigation";

import { configurationPath } from "@/lib/configuration/places";

/** `/configuration/p/{project}` on its own opens that project's first section, its Work Profile, not a not-found page (Cfg-Org). */
export default async function ProjectConfigurationIndexPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  redirect(configurationPath("work-profile", projectId));
}
