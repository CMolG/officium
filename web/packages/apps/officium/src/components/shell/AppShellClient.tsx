"use client";

import { cardPath } from "../../lib/backlog/search-links";
import { useEffect, useRef, useState } from "react";
import { Link, useRouter, useSearchParams } from "@javadaba/ui/navigation";
import { Menu } from "lucide-react";
import { AccountMenuActions, AccountMenuRow, useAuthSession } from "@javadaba/account";
import { ProductNavBar, Text } from "@javadaba/ui";
import { useVisualPerformance } from "@javadaba/ui/hooks";

import { createAppBridgeIfEmbedded, type AppDeeplink } from "@javadaba/sdk";
import { isEmbedded } from "@javadaba/sdk/platform";
import { USES_MEMORY_BACKEND } from "../../lib/backlog/get-repository";
import { SignedOutGate } from "@javadaba/account";
import { FrameProvider } from "../../lib/shell/frame-context";
import { startPwa } from "../../lib/shell/pwa";
import { registerWindowBridge } from "../../lib/shell/window-bridge";
import { BoardTourHost } from "./BoardTourHost";
import { WindowRail } from "./WindowRail";
import { PresenceBeacon } from "./PresenceBeacon";
import { SummonsHost } from "../summons/SummonsHost";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { ProjectNotice } from "../projects/ProjectNotice";
import { IS_LOCAL } from "../../lib/edition";

/**
 * The desktop surface's handshake (JDB-222 directive 2), lifted into the `/app` LAYOUT instead
 * of a leaf page (JDB-225): the Host always loads `${mountUrl}/app` (`appSurfaceRoute` is fixed,
 * `doc://contracts/app-surfaces`), and client-side navigation between the projects home
 * and a project's board must NOT re-run `ready()`/`destroy()` -- a layout is exactly the part of
 * the tree that survives that navigation, a leaf page is not.
 *
 * Also resolves the desktop deep link (`doc://contracts/desktop-deeplinks`): Officium
 * publishes `view=project&projectId=<id>`, and since `appSurfaceRoute` can't point anywhere but
 * `/app`, honoring it means a client-side redirect to `/app/p/<id>` once the shell is up.
 */
export function AppShellClient({ children, embedded = false }: { children: React.ReactNode; embedded?: boolean }) {
  const router = useRouter();
  // One-way correction, as Curriculum's `DesktopSurface`: a page CAN prove it is framed, it
  // cannot prove it is not. The server's answer (`Sec-Fetch-Dest`) keeps the first paint stable;
  // this only adds the case where that header never arrived.
  const [framed, setFramed] = useState(embedded);
  useEffect(() => {
    if (isEmbedded()) setFramed(true);
  }, []);
  // The worker that lets the browser offer Officium as an app, and that shows its notifications (Off-Shell, JAVA-1674).
  useEffect(() => startPwa(), []);
  const searchParams = useSearchParams();
  const handledDeeplink = useRef(false);
  const { session, resolved } = useAuthSession();
  // JDB-238's motion policy: `data-capability` on the root, so `[data-capability="low"]` in
  // globals.css can turn off the hover-lift and the drag resettle -- `useVisualPerformance`
  // already folds `prefers-reduced-motion` into `mode` (`packages/ui/src/hooks/use-visual-
  // performance.ts`), so this one attribute covers both the OS preference and a low-end device.
  const { mode: capability } = useVisualPerformance();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    // Only where the board IS the mock: in real use the hooks would build a second, disconnected
    // backlog in memory and publish a debug handle on `window` for every visitor (2026-09-23 audit).
    if (USES_MEMORY_BACKEND) void import("../../lib/backlog/mock-test-hooks").then((m) => m.installMockTestHooks());

    const bridge = createAppBridgeIfEmbedded("officium", {
      onInit: (init) => honorDeeplink(init.deeplink),
    });
    registerWindowBridge(bridge ?? null);
    bridge?.ready();

    // The query survives a remount/unfreeze even if `init` never arrives (see the deep-links
    // contract's "travels two paths at once"); honor whichever gets here first.
    honorDeeplink({
      view: searchParams.get("view") ?? undefined,
      params: Object.fromEntries(searchParams.entries()),
    });

    return () => {
      registerWindowBridge(null);
      bridge?.destroy();
    };
    // Only on mount: this is the SHELL handshake, run once for the whole `/app` subtree.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function honorDeeplink(deeplink?: AppDeeplink) {
    if (handledDeeplink.current || !deeplink) return;
    // `doc://contracts/desktop-deeplinks` §6: `project` opens that project's board;
    // `card` opens the same board with a card focused -- `card` is the card's KEY ("OFF-12",
    // the widget's own row link, JDB-234), not its internal id, so `Board`'s `?card=` handling
    // has to accept either (see its own comment).
    if (deeplink.view === "project" && deeplink.params?.projectId) {
      handledDeeplink.current = true;
      router.replace(`/app/p/${deeplink.params.projectId}`);
    } else if (deeplink.view === "card" && deeplink.params?.projectId && deeplink.params?.card) {
      handledDeeplink.current = true;
      router.replace(cardPath(deeplink.params.projectId, deeplink.params.card));
    }
  }

  // Booting the shell (`ready()`, above) never waits on auth -- deep-links.md's "failing can't
  // stop the app from booting" -- only what gets RENDERED depends on it. `!resolved` (still
  // asking) renders nothing rather than flashing the sign-in form at somebody who has a session.
  const signedIn = USES_MEMORY_BACKEND || IS_LOCAL || !!session;
  const content = signedIn ? children : resolved ? (
      // Off-Home, "Signed out": the board's own line, "Sign in to open your projects and their backlogs." The gate writes
      // "Sign in to open {product}", so the product here is what the person is opening.
      <SignedOutGate
        brand="officium"
        product="your projects and their backlogs"
        line="They live in your Javadaba account, the same one you use across the rest of the ecosystem."
        back={{ href: "/", label: "Back to Officium" }}
        linkAs={Link}
      />
    ) : null;
  // The workspace tree lists the account's projects, so it waits for the account too: mounted for
  // a signed-out visitor it asked `/projects` for an answer that could only be 401 (JAVA-204).
  const showNav = !framed && signedIn;

  // The root carries `data-capability` (JDB-238) and the chrome's state: `data-chrome` lets a
  // surface hide what the product bar already says (`group-data-[chrome=product]/shell:`) without
  // knowing where it is mounted. Everything below the bar gets the rest of the height; the board
  // fills it, the other surfaces scroll inside it. Its height is the body's (`h-full` down from
  // `<html>`), not the viewport's: Yoga has no viewport units (native-portability rule 4). The
  // `/app` layout opts into the whole screen (`viewport-fit=cover`, JAVA-222), so the sides keep a
  // landscape notch clear here; the bottom inset belongs to what reaches the bottom edge.
  return (
    <div
      data-capability={capability}
      data-chrome={framed ? "framed" : "product"}
      className="group/shell flex h-full flex-col pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    >
      <BoardTourHost />
      {signedIn && !IS_LOCAL && <PresenceBeacon />}
      {signedIn && <SummonsHost />}
      {/* Opened as a page, the tool wears the product bar like the product page does (user
          decision, 2026-09-15): without it there was no way back to the rest of Javadaba. Inside
          the desktop's window it doesn't -- the window IS the chrome there. */}
      {!framed && !IS_LOCAL && (
        <ProductNavBar
          brand="officium"
          wordmark="Officium"
          linkAs={Link}
          // Edge to edge like the app under it (JAVA-1548): the contained bar left 140px at 1512px.
          width="full"
          // `/account` lives on the landing, another zone: the row brings its own plain `<a>`.
          accountSlot={<AccountMenuRow />}
        accountActionsSlot={<AccountMenuActions />}
        />
      )}
      {/* The workspace's navigation tree (JAVA-52), on every `/app` route, is a persistent rail
          from `md` up; below it, a drawer opened by this toggle and hidden while closed, so a
          phone never has two copies of a link in reach. */}
      {showNav && (
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen(true)}
          className="flex flex-row min-h-11 shrink-0 items-center gap-2 border-b border-[color:var(--jd-line)] px-4 py-2 text-sm font-medium text-[color:var(--jd-ink)] md:hidden"
        >
          <Menu size={18} aria-hidden="true" /> <Text>Menu</Text>
        </button>
      )}
      {/* One mount for every surface that starts a project action: the projects home's menu and the
          sidebar's menu both report here (JAVA-1657), so a sidebar export is announced too. */}
      <ProjectNotice />
      {/* Inside a window the sidebar is not mounted, so this row is the way into every view. */}
      {framed && signedIn && <WindowRail />}
      <div className="flex flex-row min-h-0 flex-1 overflow-hidden">
        {showNav && <WorkspaceSidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />}
        <div data-testid="shell-scroll" className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <FrameProvider value={framed}>{content}</FrameProvider>
        </div>
      </div>
    </div>
  );
}
