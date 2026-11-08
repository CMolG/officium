import type { ReactNode } from "react";

import { ConfigurationShell } from "@/components/configuration/ConfigurationShell";

/**
 * Configuration's frame lives here, not in the pages (JAVA-1626), as the documentation layout does (JAVA-1536): Next keeps
 * a layout mounted across navigation between its child pages, so the sidebar, its scroll and the selector stay put.
 */
export default function ConfigurationLayout({ children }: { children: ReactNode }) {
  return <ConfigurationShell>{children}</ConfigurationShell>;
}
