import { ApiError } from "../api-error";
import { downloadFromMachine, uploadToMachine } from "../file-transfer";
import type { StorageUsage } from "../storage-usage";
import type { Attachment, CardDetail, MachineStatus, Timesheet, WriteResult } from "../types";
import { ApiCardThread } from "./card-thread";

export class ApiCardTime extends ApiCardThread {
  async logTime(
    projectId: string,
    cardId: string,
    input: { expectedVersion: number; date: string; hours: number; who: string; note?: string },
  ): Promise<WriteResult<CardDetail>> {
    try {
      await this.request(`/projects/${projectId}/cards/${cardId}/time`, { method: "POST", body: JSON.stringify(input) });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "version_conflict") {
        const body = err.body as { message: string; current: unknown };
        return { error: "version_conflict", message: body.message, current: body.current as CardDetail };
      }
      throw err;
    }
    return this.getCard(projectId, cardId);
  }

  async deleteTimeEntry(
    projectId: string,
    cardId: string,
    entryId: string,
    expectedVersion: number,
  ): Promise<WriteResult<CardDetail>> {
    try {
      await this.request(`/projects/${projectId}/cards/${cardId}/time/${entryId}`, {
        method: "DELETE",
        body: JSON.stringify({ expectedVersion }),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code === "version_conflict") {
        const body = err.body as { message: string; current: unknown };
        return { error: "version_conflict", message: body.message, current: body.current as CardDetail };
      }
      throw err;
    }
    return this.getCard(projectId, cardId);
  }

  async getTimesheet(projectId: string, from: string, to: string): Promise<Timesheet> {
    return this.request<Timesheet>(`/projects/${projectId}/timesheet?from=${from}&to=${to}`);
  }

  // ---- attachments (JDB-242/244: the bytes go to the project's machine, see file-transfer.ts) ----

  async uploadAttachment(
    projectId: string,
    cardId: string,
    file: File,
    onProgress?: (percent: number) => void,
  ): Promise<CardDetail> {
    await uploadToMachine(this.base, projectId, cardId, file, onProgress);
    return this.getCard(projectId, cardId); // see `ApiBacklogRepository`'s doc, note 3
  }

  openAttachment(
    projectId: string,
    cardId: string,
    attachment: Attachment,
    onProgress?: (percent: number) => void,
  ): Promise<Blob> {
    return downloadFromMachine(this.base, projectId, cardId, attachment, onProgress);
  }

  async getMachine(projectId: string): Promise<MachineStatus> {
    return this.request<MachineStatus>(`/projects/${projectId}/machine`);
  }

  async getUsage(): Promise<StorageUsage> {
    return this.request<StorageUsage>("/usage");
  }

  async deleteAttachment(projectId: string, cardId: string, attachmentId: string): Promise<CardDetail> {
    await this.request<void>(`/projects/${projectId}/cards/${cardId}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    return this.getCard(projectId, cardId);
  }
}
