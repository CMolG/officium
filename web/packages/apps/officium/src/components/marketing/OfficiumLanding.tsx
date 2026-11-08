import type { ProductNavSection } from "@javadaba/ui";

import { LandingBand } from "@/components/marketing/LandingBand";
import { LandingConnect } from "@/components/marketing/LandingConnect";
import { LandingFigures } from "@/components/marketing/LandingFigures";
import { LandingHero } from "@/components/marketing/LandingHero";
import { LandingPlans } from "@/components/marketing/LandingPlans";
import { LandingSection } from "@/components/marketing/LandingSection";
import { LANDING_SECTIONS } from "@/components/marketing/landing-copy";
import { ProductChrome } from "@/components/marketing/ProductChrome";

/*
 * `/officium` -- the product page (JDB-228), rebuilt as the Rule of Seven (JAVA-1639) and redrawn
 * in Quiet Bento (Off-Page). The App surface of `doc://contracts/app-surfaces`: owned by this
 * project, indexable, wearing the product chrome (`ProductNavBar`/`ProductFooter`).
 *
 * Seven sections, in the blueprint's order, each with ONE walkthrough (the hero's board, then six
 * area scenes) and its micro-sale: the hook, the mechanism, the one primary action. The sections
 * are the only `<section>` elements in `<main>`; the figures strip and the closing band are
 * `div`s, so the page keeps exactly seven. One primary action runs through the whole page: Open
 * Officium.
 *
 * The bar's Pricing links to the plans band on this page (owner X10: prices in US dollars, free
 * until a project reaches four people and becomes a company). The Business plan and its price are
 * temporary (`landing-pricing.ts`).
 *
 * The door is the ecosystem's: `OpenOfficiumCta` opens Javadaba's account dialog for a
 * signed-out visitor (invariant 7), and the bar's menu carries the session row
 * (`AccountMenuRow`), like Curriculum.
 *
 * The MCP snippet stays above the fold (JDB-228 directive); its command is a literal copy of
 * `javadaba-landing/src/lib/officium-mcp-clients.ts`, kept in sync by
 * `e2e/mcp-clients-sync.spec.ts`.
 */

/** The bar's second level. Anchors are on this page; the guide lives on the landing, another zone. */
const SECTIONS: readonly ProductNavSection[] = [
  { id: "how", label: "How it works", href: "#plan" },
  { id: "connect", label: "Connect", href: "#connect" },
  { id: "mcp", label: "MCP guide", href: "/developers/docs/officium-mcp", plain: true },
  { id: "pricing", label: "Pricing", href: "#pricing" },
];

export function OfficiumLanding() {
  return (
    <ProductChrome sections={SECTIONS}>
      <LandingHero />
      <LandingFigures />
      {LANDING_SECTIONS.map((copy, i) => (
        <LandingSection
          key={copy.id}
          copy={copy}
          index={i + 2}
          reversed={i % 2 === 1}
          extra={copy.id === "connect" ? <LandingConnect /> : undefined}
        />
      ))}
      <LandingPlans />
      {/* The closing band, after the seven sections: the write path, the proofs and the states. */}
      <LandingBand />
    </ProductChrome>
  );
}
