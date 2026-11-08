import type { ProductNavSection } from "@javadaba/ui";

import { ProductChrome } from "@/components/marketing/ProductChrome";

import { AgentsActions } from "./AgentsActions";
import { AgentsCatalog } from "./AgentsCatalog";
import { AgentsConnect } from "./AgentsConnect";
import { AgentsExample } from "./AgentsExample";
import { AgentsHero } from "./AgentsHero";
import { AgentsLimits } from "./AgentsLimits";

/*
 * `/officium/agents` -- the beachhead's first citable asset (JAVA-2040, chosen by JAVA-2039): one finished document
 * for one intent, giving an AI agent a backlog it can read and write. It carries data nobody else has, the
 * operation catalog and Javadaba's own board, both dated and also served at `/officium/agents/data.json`.
 * A B2B surface: it is not added to the desktop (`doc://contracts/app-surfaces`).
 */
const SECTIONS: readonly ProductNavSection[] = [
  { id: "actions", label: "Actions", href: "#actions" },
  { id: "catalog", label: "Catalog", href: "#catalog" },
  { id: "connect", label: "Connect", href: "#connect" },
  { id: "example", label: "Example", href: "#example" },
];

export function AgentsPage() {
  return (
    <ProductChrome sections={SECTIONS}>
      <AgentsHero />
      <AgentsActions />
      <AgentsCatalog />
      <AgentsConnect />
      <AgentsExample />
      <AgentsLimits />
    </ProductChrome>
  );
}
