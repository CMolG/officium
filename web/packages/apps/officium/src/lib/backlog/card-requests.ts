import type { Actor } from "./types";

/** `open` waits for the person; `done`/`declined` are their answer, the agent not yet resumed;
 *  `closed` is the agent finished with it (never listed). */
export type CardRequestStatus = "open" | "done" | "declined" | "closed";

export type RequestAnswer = "done" | "declined";

/** A quick action an agent working a card asks of the person (JAVA-1122). The web never opens one. */
export interface CardRequest {
  id: string;
  projectId: string;
  cardId: string;
  cardKey: string;
  cardTitle: string;
  /** One line: what the person must do. */
  action: string;
  /** Markdown: the steps or the exact command. */
  detail: string | null;
  /** Why the agent is blocked. */
  why: string | null;
  status: CardRequestStatus;
  createdBy: Actor;
  createdAt: string;
  answeredBy: Actor | null;
  answeredAt: string | null;
  note: string | null;
  closedAt: string | null;
}

export const MAX_NOTE_LENGTH = 500;

export const requestsPath = (projectId: string) => `/projects/${projectId}/requests`;

/** The path and init of `POST .../requests/{id}/answer`. */
export function answerCall(projectId: string, requestId: string, answer: RequestAnswer, note?: string): [string, RequestInit] {
  const trimmed = note?.trim();
  return [
    `${requestsPath(projectId)}/${requestId}/answer`,
    { method: "POST", body: JSON.stringify({ answer, ...(trimmed ? { note: trimmed } : {}) }) },
  ];
}

/** What the person reads when answering failed: the cause and the way out, never a bare code. */
export function answerErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === "request_not_open") return "Someone already answered this request. Close this card and reopen it to see the latest.";
  return "Your answer was not saved. Check your connection and try again.";
}

/** A request the person can still act on, or one they answered that the agent has not picked up. */
export const isLive = (request: CardRequest) => request.status !== "closed";
