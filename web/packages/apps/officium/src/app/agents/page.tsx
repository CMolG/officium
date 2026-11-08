import type { Metadata } from "next";
import { shareMetadata } from "@javadaba/brand/share";

import { AgentsPage } from "@/components/agents/AgentsPage";
import { AGENTS_DESCRIPTION, AGENTS_TITLE } from "@/lib/agents/agents-copy";
import { AGENTS_DATA, AGENTS_DATA_URL, AGENTS_URL } from "@/lib/agents/agents-data";

// The page, its description and its data file say the same thing they deliver (promise and delivery).
export const metadata: Metadata = {
  ...shareMetadata({ title: AGENTS_TITLE, description: AGENTS_DESCRIPTION, url: AGENTS_URL }),
  description: AGENTS_DESCRIPTION,
  alternates: { canonical: AGENTS_URL },
};

/** The page's dataset, for the crawlers and the people who cite it. */
const DATASET_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Officium MCP operation catalog and Javadaba board figures",
  description: AGENTS_DESCRIPTION,
  url: AGENTS_URL,
  dateModified: AGENTS_DATA.generatedOn,
  creator: { "@type": "Organization", name: "Javadaba", url: "https://javadaba.com" },
  distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: AGENTS_DATA_URL }],
};

export default function OfficiumAgentsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(DATASET_JSON_LD) }} />
      <AgentsPage />
    </>
  );
}
