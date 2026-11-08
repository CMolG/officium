import type { ReactNode } from "react";

import { DocsWorkspace } from "@/components/docs/DocsWorkspace";

/**
 * The documentation workspace lives here, not in the page (JAVA-1536): the `[[...path]]` page segment is keyed by its
 * path, so a page-level view was mounted anew on every click and reloaded the tree. A layout stays mounted.
 */
export default async function DocsLayout({ children, params }: { children: ReactNode; params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <>
      {children}
      <DocsWorkspace projectId={projectId} />
    </>
  );
}
