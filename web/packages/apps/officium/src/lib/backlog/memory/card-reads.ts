import type {
  Card,
  CardChanges,
  CardDetail,
  CardQuery,
  Page,
} from "../types";
import { PRIORITY_CONFIG, STATUS_CONFIG, isClosed } from "../status-config";
import { matchesJql, parseJql, sortByJql } from "../jql";
import { ApiError } from "../api-error";
import { YOU } from "../memory-seed";
import { epicChildren } from "../epic-badge";
import { checkpointProgress, epicCheckpoints, withCheckpointProgress } from "../checkpoints";
import { formAt, needsPerson, now } from "./rules";
import { ProjectRecord } from "./sample-record";
import { MemorySprints } from "./sprints";

export class MemoryCardReads extends MemorySprints {
  async listCards(projectId: string, query: CardQuery = {}): Promise<Page<Card>> {
    this.count("listCards");
    await this.holds.get("listCards")?.promise;
    const record = this.requireRecord(projectId);
    // OQL (JDB-270): the real API evaluates this on the server, over the whole project; this
    // repository is the in-memory stand-in for it, so it runs the exact same parser/evaluator
    // (`jql.ts`) the search view itself used to run in the browser -- same query, same cards, same
    // result, whichever repository answers.
    if (query.jql !== undefined) return this.listCardsByJql(record, query.jql, query.cursor, query.limit);
    const q = (query.q ?? "").toLowerCase();
    // "active" resolves to whichever sprint is active, if any; a project with none simply
    // matches nothing (officium-api.md §8.2).
    const sprintFilter =
      query.sprint === "active" ? [...record.sprints.values()].find((s) => s.state === "active")?.id ?? "__none__"
      : query.sprint === "backlog" ? null
      : query.sprint;
    let items = [...record.cards.values()].filter((card) => {
      const matchesSearch =
        !q ||
        card.key.toLowerCase().includes(q) ||
        card.title.toLowerCase().includes(q) ||
        card.excerpt.toLowerCase().includes(q) ||
        (card.epic ?? "").toLowerCase().includes(q) ||
        card.tags.some((t) => t.toLowerCase().includes(q));
      const matchesStatus = !query.status?.length || query.status.includes(card.status);
      const matchesPriority = !query.priority?.length || query.priority.includes(card.priority);
      const matchesEpic = !query.epic || card.epic === query.epic;
      const matchesExecutor = !query.executor || card.executor === query.executor;
      const matchesCategory = !query.category || card.category === query.category;
      const matchesBlocked = query.blocked === undefined || card.blocked === query.blocked;
      const matchesHumanEdit = query.humanEditPending === undefined || card.humanEditPending === query.humanEditPending;
      const matchesSprint = query.sprint === undefined || card.sprintId === sprintFilter;
      const matchesRejection = !query.rejection || card.rejection?.reason === query.rejection;
      const matchesRole = !query.role || card.eligibleRoles.includes(query.role);
      return matchesSearch && matchesStatus && matchesPriority && matchesEpic && matchesExecutor && matchesCategory
        && matchesBlocked && matchesHumanEdit && matchesSprint && matchesRejection && matchesRole;
    });

    switch (query.sort) {
      case "updated":
        items = items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
      case "priority":
        items = items.sort((a, b) => PRIORITY_CONFIG[a.priority].weight - PRIORITY_CONFIG[b.priority].weight);
        break;
      case "created":
        items = items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      default:
        items = items.sort(
          (a, b) => STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order || a.order - b.order,
        );
    }

    const project = [...record.cards.values()];
    return { items: items.map((card) => withCheckpointProgress(card, project)), nextCursor: null };
  }

  /** {@link #listCards}'s OQL branch: parse, filter, sort, then a plain offset cursor -- there is
   *  no separate index to narrow by here, the whole point of this repository is a small in-memory
   *  seed. A parse error throws the same shape the real API answers with (`officium-api.md`
   *  contract §1.4, `jql_invalid`), so a component reading either repository handles one error. */
  protected listCardsByJql(record: ProjectRecord, jql: string, cursor?: string, limit = 50): Page<Card> {
    const parsed = parseJql(jql);
    if (!parsed.ok) {
      throw new ApiError("jql_invalid", parsed.error.message, 400, { at: parsed.error.at });
    }
    const ctx = { currentUser: YOU.accountId, now: new Date() };
    const matched = [...record.cards.values()].filter((card) => matchesJql(card, parsed.query, ctx));
    const sorted = sortByJql(matched, parsed.query);
    const offset = cursor ? Number(cursor) || 0 : 0;
    const items = sorted.slice(offset, offset + limit).map((card) => withCheckpointProgress(card, [...record.cards.values()]));
    const nextCursor = offset + limit < sorted.length ? String(offset + limit) : null;
    return { items, nextCursor };
  }

  /**
   * JAVA-45 on the demo: with `since`, every card whatever its status -- the demo has a handful, so "everything" is a correct superset of "what changed", and the
   * board's merge keeps what did not. Copies, never the live objects: this repository mutates its
   * cards in place, and a board comparing a card with itself would never see it change.
   */
  async listChanges(projectId: string, since?: string): Promise<CardChanges> {
    this.count("listChanges");
    await this.holds.get("listChanges")?.promise;
    const record = this.requireRecord(projectId);
    const project = [...record.cards.values()];
    const cards = project.filter((card) => since !== undefined || !isClosed(card.status)).map((card) => withCheckpointProgress(card, project));
    return { asOf: now(), cards: structuredClone(cards).map(({ description: _d, actionPlan: _p, ...face }) => face), removed: record.removed ?? [] };
  }

  async getCard(projectId: string, keyOrId: string): Promise<CardDetail> {
    const record = this.requireRecord(projectId);
    const card = this.findCard(record, keyOrId);
    if (!card) throw new Error("card_not_found");
    const detail = record.details.get(card.id);
    const children = card.category === "epic" ? epicChildren(card.key, [...record.cards.values()]) : null;
    const epicMode = card.category === "epic" && (await this.getExecutionMode(projectId)).mode === "epic";
    const checkpoints = card.category === "epic" ? epicCheckpoints(card.key, [...record.cards.values()], epicMode) : null;
    return {
      ...card,
      ...(detail ?? { comments: [], timeEntries: [], attachments: [], development: [] }),
      form: detail?.form ? formAt(detail.form, card.status) : null,
      epicChildren: children?.length ?? null,
      epicChildrenOpen: children ? children.filter((c) => !isClosed(c.status)).length : null,
      checkpoints,
      checkpointProgress: checkpoints ? checkpointProgress(checkpoints) : null,
    };
  }

  async cardsNeedsHuman(projectId: string, assigneeMe = false): Promise<Card[]> {
    const record = this.requireRecord(projectId);
    return [...record.cards.values()]
      .filter((c) => c.executor === "human" && needsPerson(c.status))
      .filter((c) => !assigneeMe || c.assignees.some((a) => a.accountId === YOU.accountId))
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .map((c) => ({ ...c }));
  }

  /**
   * `PUT …/cards/{key}/form` (officium-api.md §8.16): the card gets a Quaestio form of `questions`
   * questions. Not on `BacklogRepository`: Officium never writes a form, an agent does, over the
   * MCP -- this is that write, for the mock-backed suite.
   */
}
