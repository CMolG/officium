import Link from "next/link";

import { Button, Text } from "@javadaba/ui";

import { planHref } from "@/lib/billing/plan-link";

import type { PlanCopy } from "./landing-pricing";

/** What each plan's one action is. Free enters the app, Personal opens the account's plan tab. */
export function PlanAction({ plan }: { plan: PlanCopy }) {
  if (plan.id === "free") {
    return (
      <Button asChild register="ui" variant="outline" size="md">
        {/* The app asks for the account itself (`SignedOutGate`). */}
        <Link href="/app">Start free</Link>
      </Button>
    );
  }
  if (plan.id === "personal") {
    return (
      <Button asChild register="ui" variant="solid" size="md">
        {/* Plain `<a>`: the account lives on the landing, another zone. */}
        <a href={planHref("personal_base_month")}>Choose {plan.name}</a>
      </Button>
    );
  }
  // TODO(backend): a Stripe lookup key and checkout for the Business plan, then link it like Personal.
  return (
    <>
      <Button register="ui" variant="solid" size="md" disabled aria-describedby="business-soon">
        Choose {plan.name}
      </Button>
      <Text id="business-soon" size="xs" tone="muted">
        Business plans open soon. Until then a project is free to use.
      </Text>
    </>
  );
}
