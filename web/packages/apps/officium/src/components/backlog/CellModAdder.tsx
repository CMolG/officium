"use client";

import { Button, Select, Text } from "@javadaba/ui";

import { firstSentence, modLabel } from "../../lib/backlog/role-config";
import { MAX_MODS_PER_CELL } from "../../lib/backlog/role-matrix";
import type { ModCatalog } from "../../lib/backlog/use-mods";

const HEAD = "text-xs font-bold uppercase text-[color:var(--jd-muted)]";

/** "Add a mod" from Fluxor's catalog (card://JAVA-1569), or why there is nothing to pick: loading, no project, a failed read, a full cell. */
export function CellModAdder({
  catalog,
  full,
  options,
  onAdd,
}: {
  catalog: ModCatalog;
  full: boolean;
  options: { modId: string; description: string }[];
  onAdd: (mod: string) => void;
}) {
  if (catalog.state === "none") {
    return <Text as="p" className="text-xs text-[color:var(--jd-muted)]">Mods can be added once you have a project.</Text>;
  }
  if (catalog.state === "error") {
    return (
      <div role="alert" className="flex flex-col items-start gap-1.5">
        <Text className="text-xs font-bold text-destructive">{`Couldn't load the mods: ${catalog.message}`}</Text>
        <Button type="button" register="ui" variant="outline" size="sm" className="min-h-11" onClick={catalog.retry}>
          <Text>Try again</Text>
        </Button>
      </div>
    );
  }
  if (full) return <Text as="p" className="text-xs text-[color:var(--jd-muted)]">{`A cell holds at most ${MAX_MODS_PER_CELL} mods.`}</Text>;
  return (
    <div className="flex flex-col gap-1.5">
      <Text className={HEAD}>Add a mod</Text>
      <Select
        aria-label="Add a mod"
        value=""
        placeholder={catalog.state === "loading" ? "Loading mods…" : "Add a mod"}
        disabled={catalog.state === "loading" || options.length === 0}
        options={options.map((mod) => ({ value: mod.modId, label: modLabel(mod.modId), description: firstSentence(mod.description) }))}
        onChange={onAdd}
        className="min-h-11 w-full"
      />
    </div>
  );
}
