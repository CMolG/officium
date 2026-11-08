"use client";

import { LoadingRegion, Skeleton, Text } from "@javadaba/ui";

import type { RoleSummary } from "../../lib/backlog/mod-types";
import type { RoleCatalog } from "../../lib/backlog/use-roles";

/**
 * A row's tagline: the role's title from the catalog while it loads, a skeleton one line tall (so no row moves), and
 * the state the catalog is in when it can't say (`none` and `error` leave the line empty, the section says why).
 */
export function RoleTagline({ role, catalog, entries }: { role: string; catalog: RoleCatalog; entries: Map<string, RoleSummary> }) {
  // One line tall in every state, so the row keeps its height when the title arrives.
  return (
    <div className="flex h-5 min-w-0 flex-row items-center">
      {catalog.state === "loading" ? (
        <LoadingRegion loading>
          <Skeleton className="h-3 w-3/4" />
        </LoadingRegion>
      ) : catalog.state === "ready" ? (
        <Text className="truncate text-sm text-[color:var(--jd-muted)]">
          {entries.get(role)?.title ?? "Its description isn't written yet"}
        </Text>
      ) : null}
    </div>
  );
}
