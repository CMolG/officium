import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";
import { RecordAppOpen } from "@javadaba/account";
import { ReleaseGate } from "@javadaba/account/release-gate";

import { ForgetBoardCopyOnSignOut } from "@/components/backlog/ForgetBoardCopyOnSignOut";
import { AppShellClient } from "@/components/shell/AppShellClient";
import { isOfficiumReleased } from "@/lib/release";

// The desktop surface is the APP, never an indexable -- `doc://contracts/app-surfaces`.
// Declared once here (not per leaf page): it applies to the whole `/app` subtree, projects home
// and every project's board alike.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// iOS reports `env(safe-area-inset-*)` as 0 unless the page opts into the whole screen, so the
// shell could not keep its pinned controls clear of the home indicator (JAVA-222). Only the tool
// opts in, because opting in makes the page own every inset: `AppShellClient` and
// `WorkspaceSidebar` reserve them, and the public product page outside this layout does not.
export const viewport: Viewport = { viewportFit: "cover" };

// The release list is read per request (`isOfficiumReleased`): a prerendered shell would bake
// the build machine's env into the gate, and the verdict must follow the running container's.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // `Sec-Fetch-Dest: iframe` is the browser saying this document is being loaded into a frame:
  // the desktop's window, which draws its own chrome. Read on the server so the product bar is
  // decided before the first paint, not flashed and removed -- Curriculum's `/app` does the same.
  const embedded = (await headers()).get("sec-fetch-dest") === "iframe";

  // `useSearchParams` inside `AppShellClient` (the deep link's `view`/`params`) needs a
  // Suspense boundary above it or `next build` aborts this subtree's prerender -- same reason as
  // `packages/apps/curriculum/src/app/app/page.tsx`.
  //
  // The release gate wraps EVERYTHING below it -- `.harness/rules/projects` precedent JDB-201:
  // an anonymous or non-admin GET of `/officium/app/**` must never receive the tool's markup at
  // all, not just a hidden one. `/officium` is outside this layout and stays
  // public.
  // The sign-out copy forget sits outside the gate: an anonymous visitor gets the gate's page, and
  // a copy left by the account that just signed out must still be emptied. It renders nothing.
  return (
    <>
      <ForgetBoardCopyOnSignOut />
      <ReleaseGate released={isOfficiumReleased()} product="Officium">
        <RecordAppOpen app="officium" />
        <Suspense fallback={null}>
          <AppShellClient embedded={embedded}>{children}</AppShellClient>
        </Suspense>
      </ReleaseGate>
    </>
  );
}
