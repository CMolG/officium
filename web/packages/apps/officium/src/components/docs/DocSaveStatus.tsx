"use client";

import { SaveStatus } from "@javadaba/ui";
import type { AutosaveStatus } from "@javadaba/ui/hooks";
import { Link } from "@javadaba/ui/navigation";

import { ApiError } from "../../lib/backlog/api-error";
import { configurationPath } from "../../lib/configuration/places";

/** Officium's words for the shared save line (Doc-Edit, "Every save says what happened"): the editor's six states in a sentence each. */
const LABELS = {
  pending: "Saving…",
  saving: "Saving…",
  offline: "Offline: your changes are kept and saved when you are back",
  failed: "Couldn't save",
} as const;

/**
 * Where a page's autosave stands, in words (JAVA-796), drawn by the shared `SaveStatus`: nothing until the first change;
 * "Saving…" is only seen, "Saved" is said politely; a save the network held up says it is kept; one the server refused
 * says why, as an alert, with Try again -- or, for a full allowance, where the space goes. A conflict is the merge
 * panel's to say, not this line's.
 */
export function DocSaveStatus({
  projectId,
  status,
  error,
  onRetry,
}: {
  projectId: string;
  status: AutosaveStatus;
  error: unknown;
  onRetry: () => void;
}) {
  if (status === "idle") return null;
  if (status === "failed" && error instanceof ApiError && error.code === "version_conflict") return null;
  const full = error instanceof ApiError && error.code === "storage_quota_exceeded";
  const why = error instanceof Error ? error.message : "Couldn't reach the Officium API.";
  return (
    <span data-testid="doc-save-status" className="min-w-0">
      <SaveStatus
        status={status}
        labels={LABELS}
        onRetry={full ? undefined : onRetry}
        failure={
          status === "failed" ? (
            full ? (
              <>
                {"the owner's storage is full. "}
                <Link href={configurationPath("documentation", projectId)} className="underline underline-offset-2">
                  See what takes the space
                </Link>
              </>
            ) : (
              why
            )
          ) : undefined
        }
      />
    </span>
  );
}
