"use client";

import { Button, Text } from "@javadaba/ui";

import type { RoleCatalog } from "../../lib/backlog/use-roles";

/** The catalog read in a picker: loading, or the error with Try again. Ready and none show nothing. */
export function RoleCatalogNotice({ catalog }: { catalog: RoleCatalog }) {
  if (catalog.state === "loading") {
    return (
      <Text role="status" className="text-sm text-[color:var(--jd-muted)]">
        Loading roles…
      </Text>
    );
  }
  if (catalog.state !== "error") return null;
  return (
    <div role="alert" className="flex flex-row flex-wrap items-center gap-2 text-sm">
      <Text className="min-w-0 flex-1">{`${catalog.message} The list below is Officium's own.`}</Text>
      <Button type="button" register="ui" variant="outline" size="sm" className="min-h-11" onClick={catalog.retry}>
        Try again
      </Button>
    </div>
  );
}
