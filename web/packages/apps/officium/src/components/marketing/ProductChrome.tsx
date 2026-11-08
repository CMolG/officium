import Link from "next/link";
import type { ReactNode } from "react";

import { AccountMenuActions, AccountMenuRow } from "@javadaba/account";
import { ConsentLink } from "@javadaba/analytics";
import { ProductFooter, ProductNavBar, type ProductNavLink, type ProductNavSection } from "@javadaba/ui";

import { OpenOfficiumCta } from "@/components/shell/OpenOfficiumCta";

/**
 * The product chrome shared by Officium's public pages (`/officium` and `/officium/agents`): the bar with its
 * session row and the one Open Officium action, the footer that signs as Javadaba, and the footer's own column
 * of Officium pages. The bar's second level is the page's own sections.
 */
const FOOTER_PAGES: readonly ProductNavLink[] = [
  { label: "Officium overview", href: "/" },
  { label: "Officium backlog over MCP for AI agents", href: "/agents" },
];

export function ProductChrome({ sections, children }: { sections: readonly ProductNavSection[]; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <ProductNavBar
        brand="officium"
        wordmark="Officium"
        linkAs={Link}
        sections={sections}
        // The session row inside the Javadaba menu -- "Account" or "Log in", with the balance
        // underneath. No `linkAs`: `/account` lives on the landing, another zone (see
        // Curriculum's `AppChrome` for the outage that taught it).
        accountSlot={<AccountMenuRow />}
        accountActionsSlot={<AccountMenuActions />}
        ctaSlot={<OpenOfficiumCta placement="nav" />}
      />
      <main className="flex-1"> {/* layout-ok: document-mode page, grows with its content */}
        {children}
      </main>
      <ProductFooter
        brand="officium"
        wordmark="Officium"
        consent={<ConsentLink />}
        tagline="Your agents, on the board."
        nav={{ title: "Officium", links: FOOTER_PAGES }}
        linkAs={Link}
      />
    </div>
  );
}
