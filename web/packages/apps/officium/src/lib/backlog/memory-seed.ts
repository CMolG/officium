import type { Actor, Assignee, Category, Priority, Status, TimeEntry } from "./types";

/**
 * The demo backlog's people and its seed cards: the data `InMemoryBacklogRepository` starts from,
 * kept apart from the repository's logic (the memory repository was already past the file bar).
 */

export function person(accountId: string, name: string): Actor {
  return { kind: "person", accountId, name, agentName: null };
}

export const YOU = person("acc-you", "You");
export const ANA = person("acc-ana", "Ana Reyes");
export const MARCUS = person("acc-marcus", "Marcus Cole");
export const JONAH = person("acc-jonah", "Jonah Fischer");
export const PRIYA = person("acc-priya", "Priya Shah");
export const LENA = person("acc-lena", "Lena Ortiz");
export const QA = person("acc-qa", "QA Guild");

export interface SeedComment {
  author: Actor;
  text: string;
  at: string;
}
/** A seed entry is a person's unless it says otherwise: the session fields show what an agent's
 *  reported session looks like on a card (JAVA-245). */
export type SeedEntry = { date: string; hours: number; who: string; note: string } & Partial<
  Pick<TimeEntry, "source" | "concept" | "model" | "effort" | "tokensIn" | "cachedTokensIn" | "reasoningTokens" | "tokensOut" | "subagent">
>;

/** What every card starts with: no human edit, no logged time (`loggedHours` follows its entries, JAVA-1376). */
export const NEW_CARD = { loggedHours: 0, humanEditedAt: null, humanEditedBy: null, humanEditReviewedAt: null, humanEditPending: false, reviewReturns: [] };

/** What a person's entry carries for the fields only imputed time fills. */
export const MANUAL_ENTRY = {
  source: "manual",
  concept: "work",
  model: null,
  effort: null,
  tokensIn: null,
  cachedTokensIn: null,
  reasoningTokens: null,
  tokensOut: null,
  startedAt: null,
  endedAt: null,
  subagent: null,
} as const satisfies Partial<TimeEntry>;
export interface SeedCard {
  key: string;
  title: string;
  /** Markdown, like the API stores it: the demo shows it formatted. */
  description: string;
  actionPlan?: string;
  status: Status;
  priority: Priority;
  executor: "ai" | "human";
  category: Category;
  estimate: number;
  epic: string;
  tags: string[];
  assignees: Assignee[];
  createdAt: string;
  updatedAt: string;
  createdBy: Actor;
  /** Card keys this card blocks (the symmetric `blockedBy` is derived below). */
  blocks?: string[];
  comments?: SeedComment[];
  timeEntries?: SeedEntry[];
}

export const SEED: SeedCard[] = [
  {
    key: "OFF-101",
    title: "Migrate the primary database to PostgreSQL",
    description:
      "Move the historical data off the legacy MySQL instance. Needs a **maintenance window** and a "
      + "full backup beforehand; indexes must be rebuilt and verified before we cut over.",
    actionPlan:
      "1. Freeze writes for the maintenance window\n"
      + "2. Restore the latest backup into Postgres and rebuild the indexes\n"
      + "3. Compare row counts table by table\n\n"
      + "- [x] Backup and restore drill\n"
      + "- [ ] Switch the connection string",
    status: "doing",
    priority: "superHigh",
    executor: "ai",
    category: "infrastructure",
    estimate: 12,
    epic: "Infrastructure",
    tags: ["Backend", "Database"],
    assignees: [{ accountId: ANA.accountId, name: ANA.name }, { accountId: MARCUS.accountId, name: MARCUS.name }],
    createdAt: "2026-05-12T09:00:00.000Z",
    updatedAt: "2026-07-08T15:00:00.000Z",
    createdBy: PRIYA,
    comments: [{ author: PRIYA, text: "Backup completed yesterday.", at: "2026-07-07T10:00:00.000Z" }],
    timeEntries: [
      { date: "2026-06-30", hours: 4, who: "Ana Reyes", note: "Audited the current schema" },
      { date: "2026-07-06", hours: 3.5, who: "Marcus Cole", note: "Backup and restore drill" },
    ],
  },
  {
    key: "OFF-102",
    title: "Redesign the marketing landing page",
    description: "Full redesign following the new bento style guide. Light and dark, subtle CTA motion.",
    status: "todo",
    priority: "medium",
    executor: "ai",
    category: "enhancement",
    estimate: 8,
    epic: "Marketing",
    tags: ["Design", "Frontend"],
    assignees: [{ accountId: JONAH.accountId, name: JONAH.name }],
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-07-05T09:00:00.000Z",
    createdBy: PRIYA,
    comments: [{ author: JONAH, text: "The new logo is already in the repo.", at: "2026-07-04T09:00:00.000Z" }],
    timeEntries: [{ date: "2026-07-02", hours: 2, who: "Jonah Fischer", note: "Initial wireframes" }],
  },
  {
    key: "OFF-103",
    title: "Fix items disappearing from the cart on reload",
    description: "Local state and localStorage fall out of sync on init. Repros only in Safari so far.",
    status: "deploy",
    priority: "high",
    executor: "ai",
    category: "bug",
    estimate: 2,
    epic: "Ecommerce",
    tags: ["Bug", "Frontend"],
    assignees: [{ accountId: JONAH.accountId, name: JONAH.name }],
    createdAt: "2026-07-07T09:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
    createdBy: ANA,
    comments: [{ author: ANA, text: "Confirmed, Safari only.", at: "2026-07-07T12:00:00.000Z" }],
    timeEntries: [{ date: "2026-07-08", hours: 1.5, who: "Jonah Fischer", note: "Fixed and shipped to staging" }],
  },
  {
    key: "OFF-104",
    title: "Define next quarter's performance metrics",
    description: "Talk to Data about what is already tracked and what is missing before writing the doc.",
    status: "refine",
    priority: "low",
    executor: "ai",
    category: "spike",
    estimate: 4,
    epic: "Analytics",
    tags: ["Product"],
    assignees: [{ accountId: PRIYA.accountId, name: PRIYA.name }],
    createdAt: "2026-07-06T09:00:00.000Z",
    updatedAt: "2026-07-06T09:00:00.000Z",
    createdBy: PRIYA,
  },
  {
    key: "OFF-105",
    title: "Add two-factor authentication for admin accounts",
    description:
      "TOTP support (Google Authenticator, Authy). QR codes generated **client-side**.\n\n"
      + "> Blocked on the database migration: the new credential table needs the Postgres schema.",
    status: "ready",
    priority: "superHigh",
    executor: "ai",
    category: "security",
    estimate: 16,
    epic: "Security",
    tags: ["Backend", "Auth"],
    assignees: [{ accountId: ANA.accountId, name: ANA.name }],
    createdAt: "2026-06-10T09:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
    createdBy: PRIYA,
    blocks: ["OFF-101"],
    comments: [{ author: person("acc-secops", "SecOps"), text: "Please use the library from the wiki.", at: "2026-06-15T09:00:00.000Z" }],
    timeEntries: [{ date: "2026-06-20", hours: 5, who: "Ana Reyes", note: "TOTP prototype" }],
  },
  {
    key: "OFF-106",
    title: "Review PR: shared UI components",
    description: "Check accessibility and responsiveness on the new buttons. Screen-reader pass with VoiceOver and NVDA.",
    status: "review",
    priority: "medium",
    executor: "ai",
    category: "testing",
    estimate: 3,
    epic: "Design System",
    tags: ["Frontend", "QA"],
    assignees: [{ accountId: "acc-qa", name: "QA Guild" }],
    createdAt: "2026-07-08T09:00:00.000Z",
    updatedAt: "2026-07-08T09:00:00.000Z",
    createdBy: JONAH,
    // What an agent's reported session looks like on a card (JAVA-245): the main agent's stretch
    // and one subagent's, each with its model and tokens.
    timeEntries: [
      {
        date: "2026-07-08", hours: 1.25, who: "Claude Code (demo)", note: "Imputed from Claude Code (demo)'s session, 09:10-10:25 UTC",
        source: "agentSession", concept: "work", model: "claude-opus-5-5", effort: "high",
        tokensIn: 18_400, cachedTokensIn: 2_350_000, reasoningTokens: 4_100, tokensOut: 36_900,
      },
      {
        date: "2026-07-08", hours: 0.1, who: "Claude Code (demo)", note: "Imputed from subagent Explore: find the button variants, 09:20-09:26 UTC",
        source: "agentSession", concept: "work", model: "claude-haiku-4-5-20251001", subagent: "Explore: find the button variants",
        tokensIn: 2_100, cachedTokensIn: 140_000, reasoningTokens: 0, tokensOut: 3_300,
      },
      {
        date: "2026-07-08", hours: 0.4, who: "Claude Code (demo)", note: "Imputed from Claude Code (demo)'s session, 10:30-10:54 UTC",
        source: "agentSession", concept: "test", model: "claude-opus-5-5", effort: "high",
        tokensIn: 0, cachedTokensIn: 0, reasoningTokens: 0, tokensOut: 0,
      },
    ],
  },
  {
    key: "OFF-107",
    title: "Provision the staging Kubernetes cluster",
    description:
      "## Why this needs you\nNeeds cloud-provider **console access** to create the node pool and "
      + "configure IAM roles -- not something an agent can do end to end.\n\n"
      + "## Steps\n1. Create the node pool\n2. Wire the VPC peering\n3. Hand the kubeconfig to the platform team\n\n"
      + "## Done when\n`kubectl get nodes` on staging shows the expected node count.\n\n"
      + "## Unblocks\n- OFF-110",
    status: "doing",
    priority: "high",
    executor: "human",
    category: "infrastructure",
    estimate: 10,
    epic: "Infrastructure",
    tags: ["Ops"],
    assignees: [{ accountId: LENA.accountId, name: LENA.name }],
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-09T09:00:00.000Z",
    createdBy: LENA,
    blocks: ["OFF-110"],
    timeEntries: [{ date: "2026-07-03", hours: 6, who: "Lena Ortiz", note: "Node pool + networking" }],
  },
  {
    key: "OFF-108",
    title: "Approve the Q3 security budget",
    description:
      "## Why this needs you\nSign off on the SecOps tooling renewal before the vendor's quote "
      + "expires.\n\n## Steps\n1. Review the quote\n2. Confirm it against the security budget line\n"
      + "3. Approve it in the finance tool\n\n## Done when\nThe PO is issued.\n\n## Unblocks\n(none)",
    status: "todo",
    priority: "high",
    executor: "human",
    category: "routine",
    estimate: 1,
    epic: "Security",
    tags: ["Budget"],
    assignees: [{ accountId: PRIYA.accountId, name: PRIYA.name }],
    createdAt: "2026-07-09T09:00:00.000Z",
    updatedAt: "2026-07-09T09:00:00.000Z",
    createdBy: PRIYA,
  },
  {
    key: "OFF-109",
    title: "Write onboarding docs for new hires",
    description: "A short runbook covering repo layout, local setup, and who owns what.",
    // Planned, so it may leave Refine (JAVA-915, JAVA-1592): the board's drag specs move it out.
    actionPlan: "Base: control branch\nRole: tech-lead\n\nOutline the three sections, then write each from the repo's own READMEs.",
    status: "refine",
    priority: "low",
    executor: "ai",
    category: "documentation",
    estimate: 5,
    epic: "Docs",
    tags: ["Docs"],
    assignees: [],
    createdAt: "2026-07-02T09:00:00.000Z",
    updatedAt: "2026-07-02T09:00:00.000Z",
    createdBy: ANA,
  },
  {
    key: "OFF-110",
    title: "Add rate limiting to the public API",
    description: "Per-token bucket, 429 with Retry-After. Needs a shared store since we run more than one instance.",
    status: "ready",
    priority: "medium",
    executor: "ai",
    category: "feature",
    estimate: 6,
    epic: "Infrastructure",
    tags: ["Backend"],
    assignees: [{ accountId: MARCUS.accountId, name: MARCUS.name }],
    createdAt: "2026-07-03T09:00:00.000Z",
    updatedAt: "2026-07-03T09:00:00.000Z",
    createdBy: MARCUS,
  },
  {
    key: "OFF-111",
    title: "Ship the dark mode toggle",
    description: "Persist the preference, respect prefers-color-scheme by default.",
    // Verified in production: off the board, found from "View completed".
    status: "done",
    priority: "low",
    executor: "ai",
    category: "feature",
    estimate: 3,
    epic: "Frontend",
    tags: ["Frontend", "Design"],
    assignees: [{ accountId: JONAH.accountId, name: JONAH.name }],
    createdAt: "2026-06-20T09:00:00.000Z",
    updatedAt: "2026-06-28T09:00:00.000Z",
    createdBy: JONAH,
  },
  {
    key: "OFF-112",
    title: "Investigate the flaky checkout e2e test",
    description: "Fails roughly **1 in 20** runs in CI only. Suspect a race on the payment webhook mock.",
    actionPlan: "Reproduce with `--repeat-each=20`, then wait on the webhook's response instead of a timer.",
    status: "doing",
    priority: "medium",
    executor: "ai",
    category: "testing",
    estimate: 4,
    epic: "QA",
    tags: ["Bug", "QA"],
    assignees: [{ accountId: "acc-qa", name: "QA Guild" }],
    createdAt: "2026-07-05T09:00:00.000Z",
    updatedAt: "2026-07-09T09:00:00.000Z",
    createdBy: person("acc-qa", "QA Guild"),
  },
];
