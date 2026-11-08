/**
 * The product page's money, in US dollars (Off-Page, "Plans, in dollars"; owner answer X10).
 *
 * The rule the page states from the first screen: Officium is free. It becomes a company when
 * four people are invited to one project, and only then does the price change. Until then the only
 * thing charged is room, at the price every Javadaba product charges for it
 * (`javadaba-landing/src/lib/pricing.ts`: Personal $4.99 a month, +1 GB for $1 a month).
 *
 * The plan NAMES and the Business price are temporary: the owner left them to the author and will
 * run price tests later. Change them here and nowhere else.
 *
 * TODO(backend): serve the plans from the subscription catalog (`GET /account/v1/subscription`
 * knows what Stripe can sell), so this copy cannot drift from what is charged.
 */

/** From this many people invited to one project, it counts as a company and the pricing changes. */
export const COMPANY_FROM_PEOPLE = 4;

export const FREE_ALLOWANCE = "15 MB of card and documentation text. Files are not counted.";

export type PlanId = "free" | "personal" | "business";

export interface PlanCopy {
  id: PlanId;
  name: string;
  /** Dollars; shown as "$4.99". */
  price: number;
  /** Under the price. */
  per: string;
  line: string;
  features: readonly string[];
  /** The plan offered by default once a project reaches the company size. */
  recommended?: boolean;
}

export const PLANS: readonly PlanCopy[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    per: "always",
    line: "For people and their agents, up to 3 people on a project.",
    features: [
      "Every view and every agent window",
      FREE_ALLOWANCE,
      "Officium's default roles",
    ],
  },
  {
    id: "personal",
    name: "Personal",
    price: 4.99,
    per: "a month",
    line: "Still free to use: you pay for room, like in every Javadaba product.",
    features: [
      "1 GB, and +1 GB for $1 a month",
      "Custom profiles and roles",
      "Model and effort per category",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 24,
    per: "a month",
    line: `For ${COMPANY_FROM_PEOPLE} or more people invited to a project.`,
    features: [
      "10 GB for the company's projects, and +1 GB for $1 a month",
      "People and agents with no per-seat charge",
      "Custom profiles and roles, model and effort per category",
    ],
    recommended: true,
  },
];

/** "$4.99", "$0": a price is written one way. */
export function usd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** A competitor claim: the words, where they were read and the day they were checked (never a tooltip). */
export interface SourcedClaim {
  claim: string;
  /** The page, written as the address people recognize. */
  page: string;
  url: string;
  /** ISO date. */
  checkedOn: string;
}

/**
 * How seat-priced trackers charge, read from each vendor's own pricing page on 2026-10-29. Only a
 * price printed on that page goes in; what a page does not say (for example whether an agent
 * counts as a seat) is not claimed. Re-read both pages before the date is moved.
 */
export const SEAT_PRICES: readonly (SourcedClaim & { tool: string; plan: string; price: string })[] = [
  {
    tool: "Linear",
    plan: "Basic",
    price: "$10 per user a month, billed yearly",
    claim: "Linear Basic costs $10 per user a month, billed yearly.",
    page: "linear.app/pricing",
    url: "https://linear.app/pricing",
    checkedOn: "2026-10-29",
  },
  {
    tool: "Linear",
    plan: "Business",
    price: "$16 per user a month, billed yearly",
    claim: "Linear Business costs $16 per user a month, billed yearly.",
    page: "linear.app/pricing",
    url: "https://linear.app/pricing",
    checkedOn: "2026-10-29",
  },
  {
    tool: "Jira",
    plan: "Standard",
    price: "$8.48 per user a month",
    claim: "Jira Standard costs $8.48 per user a month.",
    page: "atlassian.com/software/jira/pricing",
    url: "https://www.atlassian.com/software/jira/pricing",
    checkedOn: "2026-10-29",
  },
  {
    tool: "Jira",
    plan: "Premium",
    price: "$15.56 per user a month",
    claim: "Jira Premium costs $15.56 per user a month.",
    page: "atlassian.com/software/jira/pricing",
    url: "https://www.atlassian.com/software/jira/pricing",
    checkedOn: "2026-10-29",
  },
];

/** Section 06's source line: the one claim its hook rests on ("Paying for a seat for everyone?"). */
export const SEAT_CLAIM: SourcedClaim = {
  claim: "Linear charges for every user: $10 (Basic) or $16 (Business) a month, billed yearly.",
  page: "linear.app/pricing",
  url: "https://linear.app/pricing",
  checkedOn: "2026-10-29",
};
