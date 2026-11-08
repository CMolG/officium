"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountForm, useAuthSession } from "@javadaba/account";
import { trackConversion } from "@javadaba/analytics";
import { AccountDialog, Button } from "@javadaba/ui";

import { USES_MEMORY_BACKEND } from "../../lib/backlog/get-repository";
import { IS_LOCAL } from "../../lib/edition";

/** Where the door leads. Router-relative: the app's own `<Link>`/router prefix `basePath`. */
const DESTINATION = "/app";

/**
 * "Open Officium", the product page's primary action, in both places it appears (the bar and
 * the hero). Same shape as Curriculum's `TailorCta`: with a session it is a link into the
 * tool; without one it opens the ecosystem's account dialog on the spot, and navigates once
 * there is somebody to let in. Walking a signed-out visitor to `/app` first and asking there
 * still works (`SignedOutGate`), but it is one navigation longer than it needs to be.
 *
 * Until the first session read answers, it is a link: the SSR HTML carries a real `href`, and
 * `/app` asks for the account itself if the click lands before the answer. What this never
 * does is flash the dialog at somebody who is already signed in.
 *
 * `defaultMode="login"` for the same reason as the gate: a button that says OPEN, not JOIN.
 * The mock-backed build (`USES_MEMORY_BACKEND`) has no account to ask for, so there it stays
 * a plain link, exactly as `/app` itself does.
 */
export function OpenOfficiumCta({
  placement,
  section,
}: {
  placement: "nav" | "hero" | "section";
  /** The Rule of Seven section the click came from (`landing-copy.ts`), for the conversion. */
  section?: string;
}) {
  const router = useRouter();
  const { session, resolved } = useAuthSession();
  const [open, setOpen] = useState(false);
  const gated = !USES_MEMORY_BACKEND && !IS_LOCAL && resolved && !session;

  // The conversion is recorded once per visit by `trackConversion`, and says where the click was.
  const track = () => trackConversion("open_officium", section ? { placement, section } : { placement });

  // The bar's pill is the small cta register, matching `ProductNavBar`'s own default CTA; the
  // hero's and every section's close is the page's one solid button (the medium one).
  const skin = placement === "nav" ? { size: "sm" as const } : { size: "md" as const };

  return (
    <>
      <Button
        asChild={!gated}
        register="cta"
        variant="solid"
        size={skin.size}
        {...(gated
          ? { type: "button" as const, onClick: () => { track(); setOpen(true); } }
          : { onClick: track })}
      >
        {gated ? <span>Open Officium</span> : <Link href={DESTINATION}>Open Officium</Link>}
      </Button>

      <AccountDialog
        open={open}
        onClose={() => setOpen(false)}
        brand="officium"
        surface="product"
        kicker={null}
        title="Your Javadaba account"
        subtitle="Sign in to open your projects and their backlogs."
        ariaLabel="Javadaba account"
      >
        <AccountForm
          defaultMode="login"
          benefits={false}
          onAuthenticated={() => {
            setOpen(false);
            router.push(DESTINATION);
          }}
        />
      </AccountDialog>
    </>
  );
}
