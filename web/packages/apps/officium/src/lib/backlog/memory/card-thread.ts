import type {
  Actor,
  Card,
  CardDetail,
  FormAnswer,
  Comment,
  VersionConflict,
  WriteResult,
} from "../types";
import { recomputeLinks, wouldCycle } from "../link-lists";
import { newId } from "../format";
import { YOU } from "../memory-seed";
import { needsPerson, now } from "./rules";
import { SEED_AGENT } from "./sample-record";
import { MemoryCardWork } from "./card-work";

export class MemoryCardThread extends MemoryCardWork {
  async linkCard(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; type: "related" | "blocks"; target: string },
    actor: Actor = YOU,
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    const target = this.findCard(record, input.target);
    if (!target) throw new Error("card_not_found");

    if (input.type === "blocks") {
      if (wouldCycle(record.blockEdges, card.key, target.key)) throw new Error("blocks_cycle");
      if (!record.blockEdges.some(([from, to]) => from === card.key && to === target.key)) {
        record.blockEdges.push([card.key, target.key]);
      }
      this.touchCard(target, actor);
      recomputeLinks(record.cards, record.blockEdges);
    } else {
      if (!card.related.includes(target.key)) card.related.push(target.key);
      if (!target.related.includes(card.key)) target.related.push(card.key);
      this.touchCard(target, actor);
    }

    this.touchCard(card, actor);
    this.emit(projectId, { type: "card.link", cardId: card.id, cardKey: card.key, version: card.version, actor });
    return { ...card };
  }

  async unlinkCard(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; type: "related" | "blocks"; target: string },
    actor: Actor = YOU,
  ): Promise<WriteResult<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (card.version !== input.expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    const target = this.findCard(record, input.target);
    if (input.type === "blocks") {
      // The API deletes the edge from either end (a finished one is listed under relatedBy).
      record.blockEdges = record.blockEdges.filter(
        ([from, to]) => !((from === card.key && to === input.target) || (from === input.target && to === card.key)),
      );
      if (target) this.touchCard(target, actor);
      recomputeLinks(record.cards, record.blockEdges);
    } else {
      card.related = card.related.filter((k) => k !== input.target);
      if (target) {
        target.related = target.related.filter((k) => k !== card.key);
        this.touchCard(target, actor);
      }
    }
    this.touchCard(card, actor);
    this.emit(projectId, { type: "card.link", cardId: card.id, cardKey: card.key, version: card.version, actor });
    return { ...card };
  }

  /** Takes the card and every edge it was on out; the next catch-up names it as removed (the API does the same). */
  async deleteCard(projectId: string, cardId: string, expectedVersion: number, actor: Actor = YOU): Promise<void | VersionConflict<Card>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    if (card.version !== expectedVersion) {
      return { error: "version_conflict", message: "The card changed since you loaded it.", current: { ...card } };
    }
    record.cards.delete(card.id);
    record.details.delete(card.id);
    record.blockEdges = record.blockEdges.filter(([from, to]) => from !== card.key && to !== card.key);
    for (const other of record.cards.values()) other.related = other.related.filter((key) => key !== card.key);
    recomputeLinks(record.cards, record.blockEdges);
    record.removed = [...(record.removed ?? []), card.id];
    this.emit(projectId, { type: "card.deleted", cardId: card.id, cardKey: card.key, actor });
  }

  attachForm(projectId: string, cardKey: string, questions: number): void {
    const record = this.requireRecord(projectId);
    const card = this.findCard(record, cardKey);
    const detail = card && record.details.get(card.id);
    if (!card || !detail) throw new Error("card_not_found");
    const slug = `card-${card.key.toLowerCase()}`;
    detail.form = {
      formId: newId(`${card.id}-form`),
      slug,
      fillPath: `/quaestio/f/${slug}`,
      questionCount: questions,
      state: "open",
      answers: [],
      answeredAt: null,
      history: [],
    };
    card.formQuestions = questions;
    this.touchCard(card, SEED_AGENT);
    this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor: SEED_AGENT });
  }

  /**
   * What the server does when a form is finished (`CardFormService.completed`): only an assignee's
   * answer, on a card still waiting on a person, is kept -- it moves the card to Ready as that
   * person and leaves a rendered comment. Anyone else's answer changes nothing.
   */
  async completeForm(projectId: string, cardKey: string, answers: FormAnswer[], respondent: Actor = YOU): Promise<void> {
    const record = this.requireRecord(projectId);
    const card = this.findCard(record, cardKey);
    const detail = card && record.details.get(card.id);
    if (!card || !detail?.form) throw new Error("card_not_found");
    const isAssignee = card.assignees.some((a) => a.accountId === respondent.accountId);
    if (card.executor !== "human" || !isAssignee || !needsPerson(card.status)) return;
    const answeredAt = now();
    detail.form = {
      ...detail.form,
      history: [
        ...detail.form.history,
        { responseId: newId(`${card.id}-response`), respondentAccountId: respondent.accountId, respondentName: respondent.name, answeredAt, answers },
      ],
      answeredAt,
    };
    await this.moveCard(projectId, card.id, { expectedVersion: card.version, status: "ready", position: 1_000_000 }, respondent);
    const rendered = answers.map((a) => `**${a.prompt}**\n${String(a.value)}`).join("\n\n");
    await this.addComment(projectId, card.id, rendered, undefined, respondent);
  }

  async addComment(projectId: string, cardId: string, text: string, parentId?: string, actor: Actor = YOU): Promise<CardDetail> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    if (!card) throw new Error("card_not_found");
    const detail = record.details.get(cardId);
    if (!detail) throw new Error("card_not_found");
    // The API's rule (JAVA-524): a reply's parent is a comment of the same card.
    if (parentId && !detail.comments.some((c) => c.id === parentId)) throw new Error("parent_comment_not_found");
    const comment: Comment = {
      id: newId(`${cardId}-comment`),
      cardId,
      author: actor,
      text,
      createdAt: now(),
      updatedAt: now(),
      parentId: parentId ?? null,
    };
    detail.comments = [...detail.comments, comment];
    this.editCard(card, actor);
    this.emit(projectId, { type: "card.comment", cardId: card.id, cardKey: card.key, version: card.version, actor });
    return { ...card, ...detail };
  }
}
