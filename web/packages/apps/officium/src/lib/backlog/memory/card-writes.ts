import type {
  Actor,
  Assignee,
  Card,
  Category,
  Executor,
  Priority,
  Signal,
  SpikeSubtype,
  Status,
  WriteResult,
} from "../types";
import { recomputeLinks } from "../link-lists";
import { withEligibleRoles } from "../card-roles";
import { planRefusal, workflowFirstRefusal } from "../plan-gate";
import { subtypeFor } from "../role-config";
import { ApiError } from "../api-error";
import { NEW_CARD, YOU } from "../memory-seed";
import { epicChildren } from "../epic-badge";
import { epicMoveRefusal, followEpicStatus } from "../epic-status";
import { rejectionOutcome } from "../rejection";
import { reviewReturnOutcome } from "../review-returns";
import { parseLineage } from "../quality-lineage";
import type { MoveInput } from "../review-return-types";
import { writeSendBack } from "./send-back";
import { reviewReworkEscalation, reviewReworkLanding, requireRoomToReview } from "./review-rework";
import { recordLineage } from "./lineage";
import { recordMoveLogs } from "./move-logs";
import { isClosed } from "../status-config";
import { EPIC_HAS_NO_CHILDREN, excerptOf, normalizedSignals, now, sameContent, shapesAnEpic } from "./rules";
import { ProjectRecord } from "./sample-record";
import { MemoryCardReads } from "./card-reads";

export class MemoryCardWrites extends MemoryCardReads {
  async createCard(
    projectId: string,
    input: {
      title: string;
      description?: string;
      actionPlan?: string;
      status?: Status;
      priority?: Priority;
      executor?: Executor;
      category?: Category | null;
      signals?: Signal[];
      subtype?: SpikeSubtype | null;
      estimate?: number;
      epic?: string | null;
      tags?: string[];
      assignees?: Assignee[];
      sprintId?: string | null;
    },
    actor: Actor = YOU,
  ): Promise<Card> {
    const record = this.requireRecord(projectId);
    const status = input.status ?? "todo";
    if (status === "rejected") {
      throw new ApiError("card_born_rejected", "A card is not created rejected: create it, then move it to rejected with a reason", 400);
    }
    const number = record.nextNumber++;
    const key = `${record.project.keyPrefix}-${number}`;
    const id = key.toLowerCase();
    const executor = input.executor ?? "ai";
    const description = input.description ?? "";
    // officium-api.md §8.2 (added 2026-09-24): a new card lands in the BACKLOG unless a sprint is
    // named -- the Task Board passes the active sprint's id so a card created there stays visible.
    const sprintId = input.sprintId ?? null;
    if (sprintId !== null) {
      const sprint = record.sprints.get(sprintId);
      if (!sprint) throw new Error("sprint_not_found");
      if (sprint.state === "closed") throw new Error("sprint_closed");
      // JAVA-290, as the API: a sprint holds an epic's children, never the epic.
      if (input.category === "epic") throw new Error("epic_not_plannable");
    }
    const rank = [...record.cards.values()].filter((c) => c.sprintId === sprintId).length;
    // As the API (JAVA-391): only a spike takes a subtype.
    if (input.subtype && input.category !== "spike") throw new Error("subtype_not_allowed");

    // human_card_not_runnable's other half: a human card always has at least one assignee,
    // defaulting to the project owner (officium-api.md's domain rules).
    let assignees = input.assignees ?? [];
    if (executor === "human" && assignees.length === 0) {
      const owner = [...record.members.values()].find((m) => m.role === "owner");
      assignees = [{ accountId: owner?.accountId ?? YOU.accountId, name: owner?.name ?? YOU.name }];
    }

    const order = [...record.cards.values()].filter((c) => c.status === status).length;
    const card = withEligibleRoles({
      id,
      projectId,
      key,
      number,
      title: input.title,
      description,
      actionPlan: input.actionPlan ?? "",
      excerpt: excerptOf(description),
      status,
      runState: "idle",
      priority: input.priority ?? "medium",
      executor,
      category: input.category ?? null,
      signals: normalizedSignals(input.signals ?? []),
      subtype: subtypeFor(input.category ?? null, input.subtype),
      order,
      estimate: input.estimate ?? 0,
      epic: input.epic ?? null,
      tags: input.tags ?? [],
      assignees,
      related: [],
      blocks: [],
      blockedBy: [],
      relatedBy: [],
      blocked: false,
      sprintId,
      rank,
      version: 1,
      createdAt: now(),
      updatedAt: now(),
      createdBy: actor,
      updatedBy: actor,
      ...NEW_CARD,
    }, this.matrixOf, (c) => [...this.requireRecord(c.projectId).cards.values()].find((e) => e.key === c.epic && e.category === "epic"));
    record.cards.set(id, card);
    record.details.set(id, { comments: [], timeEntries: [], attachments: [], development: [] });
    record.transitions.push({ cardId: id, cardKey: key, category: card.category, status, at: card.createdAt, actor });
    recordLineage(record, card, null, actor);
    this.emit(projectId, { type: "card.created", cardId: id, cardKey: key, version: 1, actor });
    if (shapesAnEpic(card)) this.followEpics(record, projectId, actor);
    return { ...card };
  }

  async updateCard(
    projectId: string,
    cardId: string,
    input: {
      expectedVersion: number;
      title?: string;
      description?: string;
      actionPlan?: string;
      priority?: Priority;
      category?: Category | null;
      signals?: Signal[];
      subtype?: SpikeSubtype | null;
      estimate?: number;
      epic?: string | null;
      tags?: string[];
    },
    actor: Actor = YOU,
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    const next = {
      title: input.title !== undefined ? input.title.trim() : card.title,
      description: input.description ?? card.description,
      actionPlan: input.actionPlan ?? card.actionPlan,
      priority: input.priority ?? card.priority,
      category: input.category !== undefined ? input.category : card.category,
      signals: input.signals !== undefined ? normalizedSignals(input.signals) : card.signals,
      subtype: subtypeFor(
        input.category !== undefined ? input.category : card.category,
        input.subtype !== undefined ? input.subtype : card.subtype,
      ),
      estimate: input.estimate ?? card.estimate,
      epic: input.epic !== undefined ? input.epic : card.epic,
      tags: input.tags ?? card.tags,
    };
    if (!next.title) throw new Error("title_required");
    if (input.subtype && next.category !== "spike") throw new Error("subtype_not_allowed");
    // Same as the API (`CardService.update`): a save that changes nothing is not a write, and a
    // stale version has nothing of the caller's to lose over it.
    if (sameContent(card, next)) return { ...card };
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    const firstRefusal = workflowFirstRefusal(card, next.actionPlan);
    if (firstRefusal) throw new ApiError("workflow_first", firstRefusal, 409);
    const before = { epic: card.epic, category: card.category };
    Object.assign(card, next, { excerpt: excerptOf(next.description), lineage: parseLineage(next.description) });
    if (card.category === "epic" && card.sprintId !== null) {
      // As the API (JAVA-290): a card that becomes an epic leaves its sprint, to the backlog's end.
      const fromSprintId = card.sprintId;
      card.sprintId = null;
      card.rank = [...record.cards.values()].filter((c) => c.id !== card.id && c.sprintId === null).length;
      this.reindexRank(record, fromSprintId);
    }
    this.editCard(card, actor);
    this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor });
    if ((before.epic !== card.epic || before.category !== card.category) && (shapesAnEpic(before) || shapesAnEpic(card))) {
      this.followEpics(record, projectId, actor);
    }
    return { ...card };
  }

  /**
   * `cards.acknowledgeHumanEdit` -- not on `BacklogRepository`: only agents call it (and
   * `mock-test-hooks.ts`, which plays one). Not versioned, like the API.
   */
  async acknowledgeHumanEdit(projectId: string, keyOrId: string, actor: Actor): Promise<Card> {
    const card = this.findCard(this.requireRecord(projectId), keyOrId);
    if (!card) throw new Error("card_not_found");
    if (card.humanEditPending) {
      card.humanEditReviewedAt = now();
      card.humanEditPending = false;
      this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor });
    }
    return { ...card };
  }

  async moveCard(
    projectId: string,
    cardId: string,
    input: MoveInput,
    actor: Actor = YOU,
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    // card://JAVA-1415, as the API's RejectionRules: the demo accepts rejections, like %dev.
    const outcome = rejectionOutcome(card, input.status, input.rejection, true,
      (key) => [...record.cards.values()].find((c) => c.key === key)?.key ?? null);
    if ("refusal" in outcome) throw new ApiError(outcome.refusal.code, outcome.refusal.message, outcome.refusal.status);
    // card://JAVA-1416, as the API's ReviewReturns: a send-back from review or deploy names why.
    const back = reviewReturnOutcome(card, input.status, input.reviewReturn, actor.kind, card.eligibleRoles ?? []);
    if ("refusal" in back) throw new ApiError(back.refusal.code, back.refusal.message, back.refusal.status);
    if (card.category === "epic" && card.status !== input.status) {
      const children = epicChildren(card.key, [...record.cards.values()]).map((c) => c.status);
      // JAVA-292, as the API: an epic with no children can only be refined, or rejected.
      if (children.length === 0 && input.status !== "refine" && input.status !== "rejected") {
        throw new ApiError("epic_has_no_children", EPIC_HAS_NO_CHILDREN, 409);
      }
      // JAVA-379: one with children follows them, and closes only after them.
      const refusal = epicMoveRefusal(card.status, children, input.status);
      if (refusal) throw new ApiError(refusal.code, refusal.message, 409);
    }
    const noPlan = planRefusal(card, input.status);
    if (noPlan) throw new ApiError("contract_unmet", noPlan, 409);

    // card://JAVA-1443, as the API's ReviewRework: the cap refuses a card's arrival in review, and the send-back that
    // reaches it lands in refine with the escalation in its findings.
    const prior = card.reviewReturns ?? [];
    if (card.status !== input.status) requireRoomToReview(input.status, prior);
    const landing = reviewReworkLanding(card.status, input.status, prior);
    const move: MoveInput = { ...input, status: landing.to };

    const fromStatus = card.status;
    card.status = move.status;
    card.rejection = outcome.rejection;

    const destination = [...record.cards.values()]
      .filter((c) => c.status === move.status && c.id !== card.id)
      .sort((a, b) => a.order - b.order);
    // Like the API: Completed and Rejected are read newest first, so a card joining one takes the end.
    const position = isClosed(move.status) && fromStatus !== move.status ? destination.length : move.position;
    const clampedPosition = Math.max(0, Math.min(position, destination.length));
    destination.splice(clampedPosition, 0, card);
    destination.forEach((c, i) => {
      c.order = i;
    });

    if (fromStatus !== move.status) {
      const source = [...record.cards.values()]
        .filter((c) => c.status === fromStatus)
        .sort((a, b) => a.order - b.order);
      source.forEach((c, i) => {
        c.order = i;
      });
    }

    // A person's send-back adds to what the card says, as a person's comment does: the agent must see it.
    if (back.checked) {
      const escalation = landing.escalated ? reviewReworkEscalation(prior, back.checked.reasons) : null;
      writeSendBack(record, card, fromStatus, back.checked, actor, escalation);
      this.editCard(card, actor);
    } else {
      this.touchCard(card, actor);
    }
    if (fromStatus !== move.status) {
      record.transitions.push({ cardId: card.id, cardKey: card.key, category: card.category, status: move.status, at: card.updatedAt, actor });
    }
    recordMoveLogs(record, card, fromStatus, move, actor, this.matrixOf(projectId));
    recomputeLinks(record.cards, record.blockEdges);
    this.emit(projectId, { type: "card.moved", cardId: card.id, cardKey: card.key, version: card.version, actor });
    if (fromStatus !== move.status && shapesAnEpic(card)) this.followEpics(record, projectId, actor);
    return { ...card };
  }

  /**
   * `CardService.followEpics` (JAVA-379): every epic of the project takes the status its children
   * give it, an epic of an epic included, so it runs until nothing moves. The move goes to the end of
   * the column and is no delivery (no transition), the way the API records it.
   */
  protected followEpics(record: ProjectRecord, projectId: string, actor: Actor) {
    const cards = [...record.cards.values()];
    const epics = cards.filter((c) => c.category === "epic");
    let changed = true;
    for (let pass = 0; changed && pass <= epics.length; pass++) {
      changed = false;
      for (const epic of epics) {
        const to = followEpicStatus(epic.status, epicChildren(epic.key, cards).map((c) => c.status));
        if (!to) continue;
        const from = epic.status;
        epic.status = to;
        epic.order = cards.filter((c) => c.status === to && c.id !== epic.id).length;
        cards.filter((c) => c.status === from).sort((a, b) => a.order - b.order).forEach((c, i) => {
          c.order = i;
        });
        this.touchCard(epic, actor);
        this.emit(projectId, { type: "card.moved", cardId: epic.id, cardKey: epic.key, version: epic.version, actor });
        changed = true;
      }
    }
    recomputeLinks(record.cards, record.blockEdges);
  }
}
