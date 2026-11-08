import type { PhaseRun } from "../profile-metrics-types";
import type { DocNodeRow } from "../../docs/doc-tree";
import type {
  Actor,
  Card,
  CardDetail,
  CardForm,
  Category,
  ChangelogEntry,
  Comment,
  DocPage,
  Member,
  Project,
  Role,
  RoleMatrix,
  Sprint,
  Status,
  TimeEntry,
} from "../types";
import type { TestRun } from "../test-history-types";
import type { CardWorkflow } from "../types";
import { recomputeLinks, type BlockEdge } from "../link-lists";
import { withEligibleRoles } from "../card-roles";
import { subtypeFor } from "../role-config";
import { totalHours } from "../format";
import { WORK_RULES_TOKEN_QUOTA } from "../../work-rules/tokens";
import {
  ANA,
  JONAH,
  LENA,
  MANUAL_ENTRY,
  MARCUS,
  NEW_CARD,
  PRIYA,
  QA,
  SEED,
  YOU,
  person,
} from "../memory-seed";
import { DEFAULT_PROJECT_COLOR, DEFAULT_PROJECT_ICON } from "../project-appearance";
import { excerptOf } from "./rules";

/** A project's override (officium-api.md §8.9); version 0 until it first changes. */
export interface StoredRoleMatrix {
  overrides: RoleMatrix;
  version: number;
  updatedAt: string | null;
}

export const NO_ROLE_OVERRIDE: StoredRoleMatrix = { overrides: { categories: {}, signals: {}, runs: {} }, version: 0, updatedAt: null };

export const SAMPLE_PROJECT_ID = "proj-storefront";
export const SEED_AGENT: Actor = { kind: "agent", accountId: "acc-you", name: "You", agentName: "claude-code" };
export const KEY_PREFIX = "OFF";
/** The seeded Refine cards that carry a workflow (JAVA-1592): the plan gate lets a card leave Refine only with one. */
const SEED_WORKFLOWS: Record<string, CardWorkflow> = {
  "OFF-104": { version: 1, phases: { refine: { role: "tech-lead", mods: [] } } },
  "OFF-109": { version: 1, phases: { refine: { role: "tech-lead", mods: [] } } },
};

/** A stand-in for Officium's own pages (JAVA-783): the API ships the real ones, the same in every
 *  project; the mock shows one so the read-only page can be seen and tested without a server. */
export const OFFICIUM: Actor = person("00000000-0000-0000-0000-000000000000", "Officium");
export const BUILTIN_DOCS: readonly Omit<DocPage, "projectId">[] = [
  {
    id: "doc-builtin-roles", path: "officium/roles", title: "How card roles work",
    body: "# How card roles work\n\nAn AI agent works a card under a role, like `frontend-developer`. "
      + "Which roles it may take depends on the card's category, its phase and its signals.",
    version: 1, createdBy: OFFICIUM, updatedBy: OFFICIUM, createdAt: "2026-09-29T00:00:00Z",
    updatedAt: "2026-09-29T00:00:00Z", builtin: true, publishedAt: "2026-09-29T00:00:00Z", archivedAt: null, archivedBy: null,
  },
];

export const SEED_MEMBERS: { actor: Actor; email: string; role: Role }[] = [
  { actor: YOU, email: "you@example.com", role: "owner" },
  { actor: ANA, email: "ana@example.com", role: "editor" },
  { actor: MARCUS, email: "marcus@example.com", role: "editor" },
  { actor: JONAH, email: "jonah@example.com", role: "editor" },
  { actor: PRIYA, email: "priya@example.com", role: "editor" },
  { actor: LENA, email: "lena@example.com", role: "editor" },
  { actor: QA, email: "qa@example.com", role: "viewer" },
];

export interface CardDetailExtra {
  comments: Comment[];
  timeEntries: TimeEntry[];
  attachments: CardDetail["attachments"];
  /** Always empty: the demo has no GitHub, so nothing names a card there (officium-api.md §8.10). */
  development: CardDetail["development"];
  /** A human card's Quaestio form, the `form` of the API's card detail (officium-api.md §8.16). Its
   *  `state` is derived on read, like the server: it follows the card's status. */
  form?: CardForm;
}

/** A page in the trash: the page as it was, and who deleted it and when. */
export interface TrashedDoc {
  page: DocPage;
  deletedAt: string;
  deletedBy: Actor;
}

/** One entry per status a card entered, oldest first: the demo's stand-in for the API's activity
 *  log, just enough to compute `getMetrics` (officium-api.md §8.3) without a real activity store. */
export interface Transition {
  cardId: string;
  cardKey: string;
  category: Category | null;
  status: Status;
  at: string;
  actor: Actor;
}

/** Everything scoped to one project: its own cards, details, and members -- one backlog per
 *  project, per the program's decision 2 (`doc://history/plans/2026-09-14-officium-programa`). */
export interface ProjectRecord {
  /** Every stored `blocks` edge; the cards' four link lists are derived from it (JAVA-1114). */
  blockEdges: BlockEdge[];
  project: Project;
  cards: Map<string, Card>;
  details: Map<string, CardDetailExtra>;
  members: Map<string, Member>;
  nextNumber: number;
  /** The ids of the cards deleted, for the catch-up read's `removed`. */
  removed?: string[];
  sprints: Map<string, Sprint>;
  nextSprintNumber: number;
  transitions: Transition[];
  /** Who ran each phase a card left, on every status change (card://JAVA-1527); created on the first move. */
  phaseRuns?: PhaseRun[];
  /** Documentation pages by path (officium-api.md §8.7). */
  docs: Map<string, DocPage>;
  /** Pages in the trash by id, with who deleted them and when (JAVA-793). */
  docTrash: Map<string, TrashedDoc>;
  /** The documentation tree's sparse layout rows by path (officium-api.md §8.17). */
  docNodes: Map<string, DocNodeRow>;
  /** Where moved pages used to live: old path to the page id (officium-api.md §8.20). */
  docRedirects: Map<string, string>;
  /** The documentation changelog (officium-api.md §8.8), in recording order. */
  changelog: ChangelogEntry[];
  /** The pipeline token, kept in the clear: this backend lives in one tab and never persists. */
  changelogToken: { token: string; createdBy: Actor; createdAt: string } | null;
  /** The test-run history (officium-api.md §8.12), in recording order. */
  testRuns: TestRun[];
  roleMatrix: StoredRoleMatrix;
}

/** The sample project: its owner's, with no standing Definition of Done yet (JAVA-1446). */
function sampleProject(): Project {
  return {
    id: SAMPLE_PROJECT_ID,
    folderId: null,
    name: "Storefront",
    keyPrefix: KEY_PREFIX,
    role: "owner",
    icon: DEFAULT_PROJECT_ICON,
    iconColor: DEFAULT_PROJECT_COLOR,
    archivedAt: null,
    formLanguages: [],
    version: 1,
    createdAt: "2026-06-01T09:00:00.000Z",
    updatedAt: "2026-09-14T09:00:00.000Z",
    definitionOfDone: [],
    definitionOfDoneTokenQuota: WORK_RULES_TOKEN_QUOTA,
    protected: false,
  };
}

export function buildSampleRecord(matrixOf: (projectId: string) => RoleMatrix): ProjectRecord {
  const cards = new Map<string, Card>();
  const details = new Map<string, CardDetailExtra>();
  const orderByStatus = new Map<Status, number>();
  const blockEdges: BlockEdge[] = SEED.flatMap((seed) => (seed.blocks ?? []).map((target): BlockEdge => [seed.key, target]));
  const rankInBacklog = new Map<string, number>();
  const transitions: Transition[] = [];

  for (const seed of SEED) {
    const id = seed.key.toLowerCase();
    const order = orderByStatus.get(seed.status) ?? 0;
    orderByStatus.set(seed.status, order + 1);
    // Every card starts in the backlog (`sprintId: null`); JAVA-54's demo plans a couple into a
    // sprint once the sample sprints exist, below.
    const rank = rankInBacklog.get("backlog") ?? 0;
    rankInBacklog.set("backlog", rank + 1);
    const card = withEligibleRoles({
      id,
      projectId: SAMPLE_PROJECT_ID,
      key: seed.key,
      number: Number(seed.key.split("-")[1]),
      title: seed.title,
      description: seed.description,
      actionPlan: seed.actionPlan ?? "",
      workflow: SEED_WORKFLOWS[seed.key] ?? null,
      excerpt: excerptOf(seed.description),
      status: seed.status,
      runState: "idle",
      priority: seed.priority,
      executor: seed.executor,
      category: seed.category,
      signals: [],
      subtype: subtypeFor(seed.category, null),
      order,
      estimate: seed.estimate,
      epic: seed.epic,
      tags: seed.tags,
      assignees: seed.assignees,
      related: [],
      blocks: [],
      blockedBy: [],
      relatedBy: [],
      blocked: false,
      sprintId: null,
      rank,
      version: 1,
      createdAt: seed.createdAt,
      updatedAt: seed.updatedAt,
      createdBy: seed.createdBy,
      updatedBy: seed.createdBy,
      ...NEW_CARD, loggedHours: totalHours(seed.timeEntries ?? []),
    }, matrixOf, (c) => [...cards.values()].find((e) => e.key === c.epic && e.category === "epic"));
    cards.set(id, card);
    // A believable transition history for `getMetrics`: creation, then straight to the seed's
    // current status if it isn't the first column (a rough stand-in for the real activity log --
    // the demo has no record of every intermediate hop, only where each card started and ended up).
    transitions.push({ cardId: id, cardKey: card.key, category: card.category, status: "refine", at: seed.createdAt, actor: seed.createdBy });
    if (seed.status !== "refine") {
      transitions.push({ cardId: id, cardKey: card.key, category: card.category, status: seed.status, at: seed.updatedAt, actor: seed.createdBy });
    }
    details.set(id, {
      comments: (seed.comments ?? []).map((c, i) => ({
        id: `${id}-comment-${i}`,
        cardId: id,
        author: c.author,
        text: c.text,
        createdAt: c.at,
        updatedAt: c.at,
      })),
      timeEntries: (seed.timeEntries ?? []).map((e, i) => ({
        id: `${id}-time-${i}`,
        cardId: id,
        cardKey: seed.key,
        accountId: null,
        createdAt: `${e.date}T09:00:00.000Z`,
        ...MANUAL_ENTRY,
        ...e,
      })),
      attachments: [],
      development: [],
    });
  }

  recomputeLinks(cards, blockEdges);

  const members = new Map<string, Member>();
  for (const m of SEED_MEMBERS) {
    members.set(m.actor.accountId, {
      accountId: m.actor.accountId,
      email: m.email,
      name: m.actor.name,
      role: m.role,
      via: "direct",
      teamId: null,
      createdAt: "2026-06-01T09:00:00.000Z",
    });
  }

  return {
    blockEdges,
    project: sampleProject(),
    cards,
    details,
    members,
    nextNumber: 113,
    sprints: new Map(),
    nextSprintNumber: 1,
    transitions,
    docs: new Map(),
    docTrash: new Map(),
    docNodes: new Map(),
    docRedirects: new Map(),
    changelog: [],
    changelogToken: null,
    testRuns: [],
    roleMatrix: NO_ROLE_OVERRIDE,
  };
}
