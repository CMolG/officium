import type { Metadata } from "next";
import { brandVars, SiteJsonLd, appJsonLd } from "@javadaba/brand";
import { jdFonts } from "@javadaba/ui/fonts";
import { IS_LOCAL } from "@/lib/edition";
import { BASE_PATH, SITE_URL } from "@/lib/site";
import "./globals.css";

import { AnalyticsProvider, ConsentBanner } from "@javadaba/analytics";
import { FeedbackContextMenu } from "@javadaba/ui/feedback";

// Officium's voice and color come from the ecosystem, not from this app -- same pattern as
// every other miniapp under `packages/apps/*`: `packages/brand/src/registry.ts`'s `officium`
// entry.
const accent = brandVars("officium", "product");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Officium — Javadaba",
  description: "Backlog management for people and AI agents, on the same data, at the same time.",
  // Next writes `icons` hrefs as given (no basePath, no metadataBase), hence BASE_PATH. Why
  // it is not the `icon.tsx` file convention: `tab-icon/route.tsx` (and the same for `apple`).
  icons: {
    icon: { url: `${BASE_PATH}/tab-icon`, type: "image/png", sizes: "64x64" },
    apple: { url: `${BASE_PATH}/apple-touch-icon.png`, type: "image/png", sizes: "180x180" },
  },
};

const appNode = appJsonLd({
  slug: "officium",
  name: "Officium",
  applicationCategory: "BusinessApplication",
  url: "https://javadaba.com/officium",
  description:
    "A backlog manager people use from the web and AI agents use through MCP, on the same "
    + "data, at the same time.",
  // Monetization is undecided (HUMAN-013): no "offers" node at all, rather than the default
  // "free" every other app's structured data carries. JDB-228 acceptance: no price claim.
  price: null,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${jdFonts}`}>
      {/* `data-jd-surface="product"` -- the system's base surface (light, read/copy/fill-in),
          which is what a backlog board is. See `doc://contracts/design-system`. */}
      <body className="h-full" data-jd-surface="product" style={accent as React.CSSProperties}>
        {!IS_LOCAL && <SiteJsonLd extra={[appNode]} />}
        <FeedbackContextMenu>{children}</FeedbackContextMenu>
        <AnalyticsProvider app="officium" />
        <ConsentBanner />
      </body>
    </html>
  );
}
