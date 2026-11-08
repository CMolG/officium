import type {
  Attachment,
  MachineStatus,
  CardDetail,
  Role,
  TimeEntry,
  Timesheet,
  WriteResult,
} from "../types";
import type { StorageUsage } from "../storage-usage";
import { newId } from "../format";
import { MANUAL_ENTRY, YOU } from "../memory-seed";
import { now } from "./rules";
import type { CardPrecedence } from "../precedence";
import { MemoryCardThread } from "./card-thread";

export class MemoryCardTime extends MemoryCardThread {
  async logTime(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; date: string; hours: number; who: string; note?: string },
  ): Promise<WriteResult<CardDetail>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    const detail = record.details.get(cardId);
    if (!card || !detail) throw new Error("card_not_found");
    if (card.version !== input.expectedVersion) {
      return {
        error: "version_conflict",
        message: "The card changed since you loaded it.",
        current: { ...card, ...detail },
      };
    }
    const entry: TimeEntry = {
      id: newId(`${cardId}-time`),
      cardId,
      cardKey: card.key,
      date: input.date,
      hours: input.hours,
      who: input.who,
      accountId: null,
      note: input.note ?? "",
      createdAt: now(),
      ...MANUAL_ENTRY,
    };
    detail.timeEntries = [...detail.timeEntries, entry];
    this.touchCard(card, YOU, detail.timeEntries);
    this.emit(projectId, { type: "card.time", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
    return { ...card, ...detail };
  }

  async deleteTimeEntry(
    projectId: string,
    cardId: string,
    entryId: string,
    expectedVersion: number,
  ): Promise<WriteResult<CardDetail>> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    const detail = record.details.get(cardId);
    if (!card || !detail) throw new Error("card_not_found");
    if (card.version !== expectedVersion) {
      return {
        error: "version_conflict",
        message: "The card changed since you loaded it.",
        current: { ...card, ...detail },
      };
    }
    detail.timeEntries = detail.timeEntries.filter((e) => e.id !== entryId);
    this.touchCard(card, YOU, detail.timeEntries);
    this.emit(projectId, { type: "card.time", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
    return { ...card, ...detail };
  }

  async getTimesheet(projectId: string, from: string, to: string): Promise<Timesheet> {
    this.count("getTimesheet");
    const record = this.requireRecord(projectId);
    const entries: TimeEntry[] = [];
    for (const detail of record.details.values()) {
      for (const entry of detail.timeEntries) {
        if (entry.date < from || entry.date > to) continue;
        // The API names the card's title, epic and status on each entry (JAVA-1661); so does the demo.
        const card = record.cards.get(entry.cardId);
        entries.push({
          ...entry,
          cardTitle: card?.title ?? null,
          cardEpic: card?.epic ?? null,
          cardStatus: card?.status ?? null,
        });
      }
    }
    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.cardKey.localeCompare(b.cardKey)));
    const totalsByWho = new Map<string, number>();
    for (const entry of entries) {
      totalsByWho.set(entry.who, (totalsByWho.get(entry.who) ?? 0) + entry.hours);
    }
    return {
      from,
      to,
      entries,
      totals: [...totalsByWho.entries()].map(([who, hours]) => ({ who, hours })),
    };
  }

  // ---- attachments (JDB-244: on the project's machine, simulated) ------------------------------

  async uploadAttachment(
    projectId: string,
    cardId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<CardDetail> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    const detail = record.details.get(cardId);
    if (!card || !detail) throw new Error("card_not_found");
    this.requireMachine(projectId);
    // Nothing actually travels over a wire in the mock -- one synchronous "done" instead of a
    // fake progress ramp, which would be a lie about what is happening.
    onProgress?.(100);
    const id = newId(`${cardId}-attachment`);
    this.machineFiles.set(id, file);
    detail.attachments = [
      ...detail.attachments,
      {
        id,
        cardId,
        name: file.name,
        size: file.size,
        contentType: file.type || "application/octet-stream",
        // The API's shape (`AttachmentPaths.forUpload`): card key, 8 hex, a safe name.
        path: `${card.key}/${id.replace(/[^0-9a-f]/g, "").slice(-8).padStart(8, "0")}-${file.name.replace(/[^\p{L}\p{N}._-]/gu, "_")}`,
        createdAt: now(),
      },
    ];
    this.editCard(card, YOU);
    this.emit(projectId, { type: "card.attachment", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
    return { ...card, ...detail };
  }

  async openAttachment(projectId: string, _cardId: string, attachment: Attachment): Promise<Blob> {
    this.requireMachine(projectId);
    const file = this.machineFiles.get(attachment.id);
    if (!file) throw new Error("This machine has no file at " + attachment.path);
    return file;
  }

  async deleteAttachment(projectId: string, cardId: string, attachmentId: string): Promise<CardDetail> {
    const record = this.requireRecord(projectId);
    const card = record.cards.get(cardId);
    const detail = record.details.get(cardId);
    if (!card || !detail) throw new Error("card_not_found");
    detail.attachments = detail.attachments.filter((a) => a.id !== attachmentId);
    this.machineFiles.delete(attachmentId);
    this.touchCard(card, YOU);
    this.emit(projectId, { type: "card.attachment", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
    return { ...card, ...detail };
  }

  async getMachine(projectId: string): Promise<MachineStatus> {
    this.requireRecord(projectId);
    return this.machineOnline.get(projectId) === false
      ? { connected: false, label: null, connectedAt: null }
      : { connected: true, label: "claude-code", connectedAt: now() };
  }

  /** Test hook's lever (`simulateMachine`): the machine going away or coming back. */
  setMachineOnline(projectId: string, online: boolean) {
    this.machineOnline.set(projectId, online);
    this.emit(projectId, { type: "project.machine", actor: { kind: "agent", accountId: YOU.accountId, name: "claude-code", agentName: "claude-code" } });
  }

  /** Test hook's lever (`simulateCallerRole`): the signed-in person as an editor or a viewer of a
   *  project, which the demo otherwise always owns. */
  setCallerRole(projectId: string, role: Role) {
    this.requireRecord(projectId).project.role = role;
  }

  /** Test hook's lever (`simulateCardPrecedence`): the rule that ranks a card, which the twin does not compute. */
  setCardPrecedence(projectId: string, keyOrId: string, precedence: CardPrecedence | null) {
    const record = this.requireRecord(projectId);
    const card = this.findCard(record, keyOrId);
    if (!card) return;
    card.precedence = precedence;
    this.emit(projectId, { type: "card.updated", cardId: card.id, cardKey: card.key, version: card.version, actor: YOU });
  }

  protected requireMachine(projectId: string) {
    if (this.machineOnline.get(projectId) === false) {
      throw new Error("No machine is hosting this project's files right now. Ask the project's agent to call files.connect.");
    }
  }

  /** Same measure as the API's `StorageUsage` (UTF-8 bytes of the card text), over every project. */
  async getUsage(): Promise<StorageUsage> {
    const encoder = new TextEncoder();
    const bytes = (value: string | null | undefined) => (value ? encoder.encode(value).length : 0);
    let usedBytes = 0;
    for (const record of this.records.values()) {
      for (const card of record.cards.values()) {
        const detail = record.details.get(card.id);
        usedBytes += bytes(card.title) + bytes(card.description) + bytes(card.actionPlan) + bytes(card.epic)
          + card.tags.reduce((sum, tag) => sum + bytes(tag), 0);
        for (const comment of detail?.comments ?? []) usedBytes += bytes(comment.text);
        for (const entry of detail?.timeEntries ?? []) usedBytes += bytes(entry.who) + bytes(entry.note);
        for (const file of detail?.attachments ?? []) usedBytes += bytes(file.name) + bytes(file.path);
      }
    }
    // The mock has no shared pool: what the API answers for an account that has bought nothing.
    const freeBytes = 15_000_000;
    return { usedBytes, limitBytes: freeBytes, freeBytes, sharedBytes: 0, sharedAvailableBytes: 0, otherApps: [] };
  }
}
