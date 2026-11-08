import { Badge, Panel, Text } from "@javadaba/ui";

import { LandingCompare } from "./LandingCompare";
import { PlanAction } from "./PlanAction";
import { COMPANY_FROM_PEOPLE, PLANS, usd } from "./landing-pricing";

/**
 * The plans band (Off-Page, "Plans, in dollars"; owner X10). It opens with the rule, so the page
 * says from its first scroll that it is free until a project becomes a company, and it leads with
 * marks the company plan for that case. A `div`, not a section: the page keeps exactly seven.
 */
export function LandingPlans() {
  return (
    <div id="pricing" aria-label="Pricing" role="region" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 md:py-20">
      <div className="flex flex-col gap-3">
        <Text type="kicker">Pricing</Text>
        <h2 className="m-0 text-balance font-[family-name:var(--font-jd-display)] text-3xl font-bold tracking-tight sm:text-4xl">
          Free until it is a company.
        </h2>
        <Text type="body-l" tone="muted" className="max-w-prose text-pretty">
          Officium is free to use. From {COMPANY_FROM_PEOPLE} people invited to a project it counts as a company and the
          pricing changes. Until then you pay only for the room you use, at the price of every Javadaba product.
        </Text>
      </div>

      <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <li key={plan.id} className="flex min-w-0">
            <Panel
              material={plan.recommended ? "raised" : "plain"}
              radius="bento"
              className="flex w-full flex-col gap-4 p-6"
            >
              <div className="flex flex-row items-center justify-between gap-2">
                <Text type="h3" as="h3">
                  {plan.name}
                </Text>
                {plan.recommended ? (
                  <Badge register="chip" tone="accent" fill="subtle" size="sm">
                    From {COMPANY_FROM_PEOPLE} people
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-row flex-wrap items-baseline gap-2">
                <span className="font-[family-name:var(--font-jd-display)] text-4xl font-bold leading-none">
                  {usd(plan.price)}
                </span>
                <Text size="sm" tone="muted">
                  {plan.per}
                </Text>
              </div>
              <Text size="sm" tone="muted" className="text-pretty">
                {plan.line}
              </Text>
              <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col items-start gap-2 pt-2">
                <PlanAction plan={plan} />
              </div>
            </Panel>
          </li>
        ))}
      </ul>

      <LandingCompare />
    </div>
  );
}
