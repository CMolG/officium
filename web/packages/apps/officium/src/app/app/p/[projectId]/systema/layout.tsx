import type { ReactNode } from "react";

import { SystemaShell } from "@/components/systema/SystemaShell";

/**
 * Systema's frame lives here, not in the pages (JAVA-1600), as Configuration's does (JAVA-1626): Next keeps a layout
 * mounted across navigation between its child pages, so the sidebar and its fold stay put.
 */
export default async function SystemaLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <SystemaShell projectId={projectId}>{children}</SystemaShell>;
}
