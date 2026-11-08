import type { Card, Sprint, WriteResult } from "../types";
import { isFinished } from "../link-lists";
import { isClosed } from "../status-config";
import { newId } from "../format";
import { YOU } from "../memory-seed";
import { now } from "./rules";
import { ProjectRecord } from "./sample-record";
import { MemoryRoles } from "./roles";

export class MemorySprints extends MemoryRoles {
  /**
   * JAVA-53/54 on the demo: a planned sprint and a closed one, so the Backlog view and a sprint
   * picker (Contributions' period select) are never completely empty. Deliberately NO active
   * sprint and NO cards planned into either: the Task Board's own filter (officium-api.md §8.2)
   * only activates once a sprint is active, and every OTHER spec in this suite -- written before
   * JAVA-49 -- expects the Storefront board to show every seed card by default. Planting an
   * active sprint here broke 30+ of them at once (2026-09-24); the lifecycle itself (plan ->
   * start -> filtered board -> complete) is exercised end to end against a FRESH project instead
   * (`backlog-sprints.spec.ts`), which starts with no sprints and can't collide with anything.
   */
  protected seedSprints(projectId: string) {
    const record = this.requireRecord(projectId);
    const planned: Sprint = {
      id: newId("sprint"), projectId, name: `${record.project.keyPrefix} Sprint 2`, goal: "Ship the Postgres cutover and close out the flaky checkout test.",
      state: "planned", startDate: null, endDate: null, startedAt: null, closedAt: null,
      order: 0, version: 1, createdAt: "2026-09-20T09:00:00.000Z", updatedAt: "2026-09-20T09:00:00.000Z",
      cardCount: 0, openCardCount: 0, estimate: 0,
    };
    const closed: Sprint = {
      id: newId("sprint"), projectId, name: `${record.project.keyPrefix} Sprint 0`, goal: "Groundwork: auth and the design system.",
      state: "closed", startDate: "2026-08-25", endDate: "2026-09-05", startedAt: "2026-08-25T09:00:00.000Z", closedAt: "2026-09-05T18:00:00.000Z",
      order: 0, version: 1, createdAt: "2026-08-24T09:00:00.000Z", updatedAt: "2026-09-05T18:00:00.000Z",
      cardCount: 0, openCardCount: 0, estimate: 0,
    };
    record.sprints.set(planned.id, planned);
    record.sprints.set(closed.id, closed);
    record.nextSprintNumber = 3;
  }


  // ---- sprints (officium-api.md §8.2, JAVA-53/54) -------------------------------------------

  /** `cardCount`/`openCardCount`/`estimate` are computed on read, not stored: they always agree
   *  with the cards, never a second number to keep in sync. */
  protected sprintView(record: ProjectRecord, sprint: Sprint): Sprint {
    const cards = [...record.cards.values()].filter((c) => c.sprintId === sprint.id);
    return {
      ...sprint,
      cardCount: cards.length,
      openCardCount: cards.filter((c) => !isFinished(c.status) && !isClosed(c.status)).length,
      estimate: cards.reduce((sum, c) => sum + c.estimate, 0),
    };
  }

  protected reindexRank(record: ProjectRecord, sprintId: string | null) {
    const bucket = [...record.cards.values()]
      .filter((c) => c.sprintId === sprintId)
      .sort((a, b) => a.rank - b.rank);
    bucket.forEach((c, i) => {
      c.rank = i;
    });
  }

  async listSprints(projectId: string, state?: Sprint["state"]): Promise<Sprint[]> {
    const record = this.requireRecord(projectId);
    const all = [...record.sprints.values()].filter((s) => !state || s.state === state);
    const active = all.filter((s) => s.state === "active");
    const planned = all.filter((s) => s.state === "planned").sort((a, b) => a.order - b.order);
    const closed = all.filter((s) => s.state === "closed").sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
    return [...active, ...planned, ...closed].map((s) => this.sprintView(record, s));
  }

  async createSprint(
    projectId: string,
    input: { name?: string; goal?: string; startDate?: string | null; endDate?: string | null } = {},
  ): Promise<Sprint> {
    const record = this.requireRecord(projectId);
    const number = record.nextSprintNumber++;
    const order = [...record.sprints.values()].filter((s) => s.state === "planned").length;
    const sprint: Sprint = {
      id: newId("sprint"),
      projectId,
      name: input.name?.trim() || `${record.project.keyPrefix} Sprint ${number}`,
      goal: input.goal ?? "",
      state: "planned",
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      startedAt: null,
      closedAt: null,
      order,
      version: 1,
      createdAt: now(),
      updatedAt: now(),
      cardCount: 0,
      openCardCount: 0,
      estimate: 0,
    };
    record.sprints.set(sprint.id, sprint);
    this.emit(projectId, { type: "sprint.changed", actor: YOU });
    return this.sprintView(record, sprint);
  }

  protected requireSprint(record: ProjectRecord, sprintId: string): Sprint {
    const sprint = record.sprints.get(sprintId);
    if (!sprint) throw new Error("sprint_not_found");
    return sprint;
  }

  async updateSprint(
    projectId: string,
    sprintId: string,
    input: {
      expectedVersion: number;
      name?: string;
      goal?: string;
      startDate?: string | null;
      endDate?: string | null;
      order?: number;
    },
  ): Promise<WriteResult<Sprint>> {
    const record = this.requireRecord(projectId);
    const sprint = this.requireSprint(record, sprintId);
    if (sprint.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The sprint changed since you loaded it.", current: this.sprintView(record, sprint) };
    }
    if (input.name !== undefined && input.name.trim()) sprint.name = input.name.trim();
    if (input.goal !== undefined) sprint.goal = input.goal;
    if (input.startDate !== undefined) sprint.startDate = input.startDate;
    if (input.endDate !== undefined) sprint.endDate = input.endDate;
    if (input.order !== undefined) sprint.order = input.order;
    sprint.version += 1;
    sprint.updatedAt = now();
    this.emit(projectId, { type: "sprint.changed", actor: YOU });
    return this.sprintView(record, sprint);
  }

  async startSprint(
    projectId: string,
    sprintId: string,
    input: { expectedVersion: number; startDate?: string | null; endDate?: string | null },
  ): Promise<WriteResult<Sprint>> {
    const record = this.requireRecord(projectId);
    const sprint = this.requireSprint(record, sprintId);
    if (sprint.state !== "planned") throw new Error("sprint_not_planned");
    if ([...record.sprints.values()].some((s) => s.state === "active")) throw new Error("sprint_already_active");
    if (sprint.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The sprint changed since you loaded it.", current: this.sprintView(record, sprint) };
    }
    sprint.state = "active";
    sprint.startedAt = now();
    if (input.startDate !== undefined) sprint.startDate = input.startDate;
    if (input.endDate !== undefined) sprint.endDate = input.endDate;
    sprint.version += 1;
    sprint.updatedAt = now();
    this.emit(projectId, { type: "sprint.changed", actor: YOU });
    return this.sprintView(record, sprint);
  }

  async completeSprint(
    projectId: string,
    sprintId: string,
    input: { expectedVersion: number; moveOpenCardsTo: string },
  ): Promise<WriteResult<{ sprint: Sprint; moved: string[] }>> {
    const record = this.requireRecord(projectId);
    const sprint = this.requireSprint(record, sprintId);
    if (sprint.state !== "active") throw new Error("sprint_not_active");
    if (!input.moveOpenCardsTo) throw new Error("move_target_required");
    const target = input.moveOpenCardsTo === "backlog" ? null : this.requireSprint(record, input.moveOpenCardsTo).id;
    if (sprint.version !== input.expectedVersion) {
      return {
        error: "version_conflict",
        message: "The sprint changed since you loaded it.",
        current: { sprint: this.sprintView(record, sprint), moved: [] },
      };
    }
    const openCards = [...record.cards.values()].filter((c) => c.sprintId === sprint.id && !isFinished(c.status) && !isClosed(c.status));
    const moved: string[] = [];
    for (const card of openCards) {
      card.sprintId = target;
      card.rank = [...record.cards.values()].filter((c) => c.id !== card.id && c.sprintId === target).length;
      moved.push(card.key);
    }
    if (target !== null) this.reindexRank(record, target);
    sprint.state = "closed";
    sprint.closedAt = now();
    sprint.version += 1;
    sprint.updatedAt = now();
    this.emit(projectId, { type: "sprint.changed", actor: YOU });
    return { sprint: this.sprintView(record, sprint), moved };
  }

  async deleteSprint(projectId: string, sprintId: string, expectedVersion: number): Promise<void> {
    const record = this.requireRecord(projectId);
    const sprint = this.requireSprint(record, sprintId);
    if (sprint.state !== "planned") throw new Error("sprint_not_planned");
    if (sprint.version !== expectedVersion) throw new Error("version_conflict");
    for (const card of record.cards.values()) {
      if (card.sprintId === sprint.id) {
        card.sprintId = null;
        card.rank = [...record.cards.values()].filter((c) => c.id !== card.id && c.sprintId === null).length;
      }
    }
    this.reindexRank(record, null);
    record.sprints.delete(sprint.id);
    // The remaining planned sprints stay dense.
    [...record.sprints.values()]
      .filter((s) => s.state === "planned")
      .sort((a, b) => a.order - b.order)
      .forEach((s, i) => {
        s.order = i;
      });
    this.emit(projectId, { type: "sprint.changed", actor: YOU });
  }

  async setCardSprint(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; sprintId: string | null; position: number },
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (input.sprintId !== null) {
      const sprint = this.requireSprint(record, input.sprintId);
      if (sprint.state === "closed") throw new Error("sprint_closed");
      if (card.category === "epic") throw new Error("epic_not_plannable");
    }
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    const fromSprintId = card.sprintId;
    card.sprintId = input.sprintId;
    const destination = [...record.cards.values()]
      .filter((c) => c.sprintId === input.sprintId && c.id !== card.id)
      .sort((a, b) => a.rank - b.rank);
    const clamped = Math.max(0, Math.min(input.position, destination.length));
    destination.splice(clamped, 0, card);
    destination.forEach((c, i) => {
      c.rank = i;
    });
    if (fromSprintId !== input.sprintId) this.reindexRank(record, fromSprintId);
    this.touchCard(card, YOU);
    this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
    return { ...card };
  }

  // ---- contributions: metrics (officium-api.md §8.3, JAVA-55/56) -----------------------------

  /**
   * Computed from the demo's own stand-ins for the real API's activity log and time entries
   * (`ProjectRecord.transitions`, `CardDetailExtra.timeEntries`) -- the same shape `getMetrics`
   * gives back, but a simplification: the demo keeps only each card's FIRST and its most recent
   * status hop (`buildSampleRecord`'s comment), not every intermediate one, so `meanCycleHours`
   * and `inStatusHours` are approximations here, never wrong in direction, sometimes short of a
   * hop the real activity log would have recorded. Good enough to develop and test the UI
   * against; the real numbers come from `javadaba-api/contexts/officium`.
   */
}
