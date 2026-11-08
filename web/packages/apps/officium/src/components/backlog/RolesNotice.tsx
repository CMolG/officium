import { ApiError } from "../../lib/backlog/api-error";
import { Text } from "@javadaba/ui";

export type Notice =
  | { kind: "saved" }
  | { kind: "stale" }
  | { kind: "conflict"; lost: number }
  | { kind: "error"; message: string };

/** A failed read in words: a missing project is not a network failure, and neither is a code. */
export function loadErrorText(err: unknown): string {
  const missing = (err instanceof ApiError && err.status === 404) || (err instanceof Error && err.message === "project_not_found");
  if (missing) return "This project doesn't exist, or you're not one of its members.";
  return err instanceof Error ? err.message : "Couldn't reach the Officium API.";
}

export function NoticeLine({ notice }: { notice: Notice }) {
  const box = "mb-6 rounded-[var(--radius-jd-md)] border px-4 py-3 text-sm font-medium";
  switch (notice.kind) {
    case "saved":
      return (
        <Text as="p" role="status" className={`${box} border-[color:var(--jd-line)]`}>
          Saved. The next time an agent picks up a card in this project, it gets these roles.
        </Text>
      );
    case "stale":
      return (
        <Text as="p" role="status" className={`${box} border-[color:var(--jd-line)]`}>
          Someone else changed this project&apos;s roles while you were editing. Saving will show you their version first.
        </Text>
      );
    case "conflict":
      return (
        <Text as="p" role="alert" className={`${box} border-destructive/40 bg-destructive/10 text-destructive`}>
          {`Not saved: someone else saved this project's roles first. Their version is shown below, and your ${
            notice.lost === 1 ? "change was" : `${notice.lost} changes were`
          } not applied. Make ${notice.lost === 1 ? "it" : "them"} again if ${notice.lost === 1 ? "it still applies" : "they still apply"}.`}
        </Text>
      );
    case "error":
      return (
        <Text as="p" role="alert" className={`${box} border-destructive/40 bg-destructive/10 text-destructive`}>
          {`Couldn't save: ${notice.message}. Your changes are still here; try again.`}
        </Text>
      );
  }
}
