import type { Metadata } from "next";

import { docsShareMetadata } from "@/lib/docs/share";

export const metadata: Metadata = {
  ...docsShareMetadata,
  title: "Officium — Documentation",
};

/** The docs view is the `docs` layout's (JAVA-1536), so it survives moving between pages: this route only names them. */
export default function DocsPage() {
  return null;
}
