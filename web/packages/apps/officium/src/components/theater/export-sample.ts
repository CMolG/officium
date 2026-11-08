// Sample data for the leave-anytime scene: three cards of a demo project, written the way the export
// writes them (`BacklogMarkdown.serialize`). Nothing here is read from a repository: the scene labels
// it as sample, and the files are strings built once, so the scene stays deterministic.

/** The demo project's key prefix, and the zip the export names for it. */
export const EXPORT_PREFIX = "OFF";
export const EXPORT_ZIP = `${EXPORT_PREFIX}-backlog-2026-10-20.zip`;

/**
 * The frontmatter's keys, in the order the serializer emits them (`BacklogMarkdown.KEY_ORDER`). A
 * test in `export-script-pure.spec.ts` pins this list, and the real-server test pins the serializer
 * to it, so a change to either side breaks a test rather than the scene.
 */
export const EXPORT_KEY_ORDER = [
  "task_id",
  "priority",
  "status",
  "runState",
  "order",
  "estimate",
  "category",
  "tags",
  "createdAt",
  "updatedAt",
] as const;

export interface SampleCard {
  key: string;
  title: string;
  priority: string;
  status: string;
  category: string;
  tags: string[];
  description: string;
  plan: string;
  comment: { author: string; date: string; text: string };
}

export const SAMPLE_CARDS: readonly SampleCard[] = [
  {
    key: "OFF-101",
    title: "Migrate the primary database to PostgreSQL",
    priority: "high",
    status: "todo",
    category: "infrastructure",
    tags: ["database"],
    description: "The primary store moves off the legacy engine, with the cutover planned in one window.",
    plan: "Dual-write for one release, backfill, then switch the reads.",
    comment: { author: "Claude Code", date: "2026-10-18", text: "Backfill script drafted; the reads are not switched yet." },
  },
  {
    key: "OFF-103",
    title: "Fix items disappearing from the cart on reload",
    priority: "medium",
    status: "doing",
    category: "bug",
    tags: ["checkout"],
    description: "A reload drops the cart when the session cookie is older than the cart.",
    plan: "Reproduce with a stale cookie, then keep the cart keyed by the visitor, not the session.",
    comment: { author: "Ana", date: "2026-10-19", text: "Reproduced on the staging build." },
  },
  {
    key: "OFF-112",
    title: "Investigate the flaky checkout end-to-end test",
    priority: "low",
    status: "ready",
    category: "spike",
    tags: ["testing"],
    description: "The checkout test fails about one run in twenty on the slowest runner.",
    plan: "Time box of a day: find the wait that is not waiting for anything.",
    comment: { author: "Claude Code", date: "2026-10-20", text: "The failing wait is the payment iframe's load event." },
  },
];

/** The label the scene puts on its sample data, in the heading and the foot. */
export const SAMPLE_LABEL = "Sample data";

/**
 * One card as the export writes it: frontmatter in the serializer's key order, then the title, the
 * description, the plan and the comments, the way `BacklogMarkdown.renderBody` lays them out.
 */
export function sampleFile(card: SampleCard): string {
  const frontmatter = [
    `task_id: ${card.key}`,
    `priority: ${card.priority}`,
    `status: ${card.status}`,
    `runState: idle`,
    `order: 0`,
    `estimate: 0`,
    `category: ${card.category}`,
    `tags: [${card.tags.join(", ")}]`,
    `createdAt: 2026-10-01T09:00:00Z`,
    `updatedAt: 2026-10-20T09:00:00Z`,
  ];
  const { author, date, text } = card.comment;
  return [
    "---",
    ...frontmatter,
    "---",
    `# ${card.title}`,
    "",
    card.description,
    "",
    "## Action plan",
    "",
    card.plan,
    "",
    "## Comments",
    `- **${author}** (${date}): ${text}`,
    "",
  ].join("\n");
}
