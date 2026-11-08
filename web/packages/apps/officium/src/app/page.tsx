import type { Metadata } from "next";
import { shareMetadata } from "@javadaba/brand/share";

import { OfficiumLanding } from "@/components/marketing/OfficiumLanding";
import { SITE_URL } from "@/lib/site";

// The og: and twitter: tags are the design's (Off-Previews, "The tags of /officium"); the card
// itself is the colocated `opengraph-image`. The meta description keeps the longer sentence that
// says what an agent does here, because that is what a search result shows.
export const metadata: Metadata = {
  ...shareMetadata({
    title: "Officium: a backlog for your team and your AI agents",
    description: "A backlog your team and your AI agents work on together. Vacation mode: ON.",
    url: SITE_URL,
  }),
  description:
    "Officium is a backlog your team uses from the web and your AI agents use through MCP. "
    + "An agent writes its plan before it starts, its card lights up while it works, and what "
    + "only a person can do lands in a Needs you lane.",
  alternates: { canonical: SITE_URL },
};

export default function OfficiumProductPage() {
  return <OfficiumLanding />;
}
