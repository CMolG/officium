import { apiFetch } from "@javadaba/sdk/platform";

import type { FeedbackMetadata } from "./collect-metadata";

/** `doc://contracts/feedback-api`: `POST /api/feedback/v1/reports`, anonymous or with `jdb_session`. */
export const REPORTS_PATH = "/api/feedback/v1/reports";

export type FeedbackKind = "problem" | "suggestion";

export interface ReportInput {
  kind: FeedbackKind;
  message: string;
  contactEmail?: string;
  metadata: FeedbackMetadata;
  /** Sent again with the same id, a retry returns the stored report instead of making a second. */
  reportId: string;
}

export type SubmitResult =
  | { ok: true }
  /** `retryAfter` is the seconds the server asked us to wait (its `Retry-After`), when it said. */
  | { ok: false; reason: "rate_limited"; retryAfter?: number }
  | { ok: false; reason: "network" | "invalid" | "unknown" };

/** How long the send button sleeps after a 429 that did not say. */
export const DEFAULT_RETRY_AFTER = 40;

export async function submitReport(input: ReportInput, path: string = REPORTS_PATH): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await apiFetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: input.kind,
        message: input.message.trim(),
        ...(input.contactEmail?.trim() ? { contactEmail: input.contactEmail.trim() } : {}),
        metadata: input.metadata,
        reportId: input.reportId,
      }),
    });
  } catch {
    return { ok: false, reason: "network" };
  }
  if (response.ok) return { ok: true };
  if (response.status === 429) {
    const seconds = Number.parseInt(response.headers.get("Retry-After") ?? "", 10);
    return { ok: false, reason: "rate_limited", retryAfter: seconds > 0 ? seconds : undefined };
  }
  if (response.status === 400 || response.status === 413) return { ok: false, reason: "invalid" };
  return { ok: false, reason: "unknown" };
}
