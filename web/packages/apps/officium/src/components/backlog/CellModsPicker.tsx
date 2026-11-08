"use client";

import { X } from "lucide-react";
import { Link } from "@javadaba/ui/navigation";

import { Button, Text } from "@javadaba/ui";

import type { ModCatalog } from "../../lib/backlog/use-mods";
import { modLabel, modSheetHref, roleLabel } from "../../lib/backlog/role-config";
import { MAX_MODS_PER_CELL } from "../../lib/backlog/role-matrix";
import { cellWarnings, rulesOf } from "../../lib/backlog/role-mods";
import { CellModAdder } from "./CellModAdder";

const HEAD = "text-xs font-bold uppercase text-[color:var(--jd-muted)]";

/**
 * A cell's mods (card://JAVA-1569): the ones its roles always follow (required by their sheets, read-only), then the ones
 * this cell adds, each removable, and "Add a mod" from Fluxor's catalog. The picker says what a pick would clash with,
 * and which roles require a mod, before the cell is saved.
 */
export function CellModsPicker({
  mods,
  roles,
  catalog,
  onChange,
}: {
  mods: string[];
  roles: string[];
  catalog: ModCatalog;
  onChange: (mods: string[]) => void;
}) {
  const known = catalog.state === "ready" ? catalog.mods : [];
  const rules = rulesOf(known);
  const floor = [...new Set(roles.flatMap((role) => rules.requiredByRole[role] ?? []))];
  const addable = known.filter((mod) => !mods.includes(mod.modId) && !floor.includes(mod.modId));
  const warnings = cellWarnings(rules, mods, roles, modLabel);
  const requiredBy = (mod: string) => roles.filter((role) => (rules.requiredByRole[role] ?? []).includes(mod));

  return (
    <section className="flex flex-col gap-2" aria-label="Mods" data-testid="cell-mods">
      <Text className={HEAD}>Mods</Text>
      {floor.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Mods the roles here require">
          {floor.map((mod) => (
            <li key={mod} data-mod={mod} data-required="true" className="flex flex-col">
              <Link href={modSheetHref(mod)} className="min-h-11 content-center text-sm font-medium underline underline-offset-2">
                <Text>{modLabel(mod)}</Text>
              </Link>
              <Text className="-mt-2 text-xs text-[color:var(--jd-muted)]">{`Always on: ${requiredBy(mod).map(roleLabel).join(", ")} ${requiredBy(mod).length === 1 ? "requires" : "require"} it.`}</Text>
            </li>
          ))}
        </ul>
      )}
      {mods.length > 0 ? (
        <ul className="flex flex-col gap-1" aria-label="Mods in this cell">
          {mods.map((mod) => (
            <li key={mod} data-mod={mod} className="flex flex-row items-center gap-2">
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={modSheetHref(mod)} className="text-sm font-medium underline underline-offset-2">
                  <Text>{modLabel(mod)}</Text>
                </Link>
                <Text className="font-mono text-xs text-[color:var(--jd-muted)]">{mod}</Text>
              </div>
              <Button
                type="button"
                register="ui"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`Remove ${modLabel(mod)}`}
                onClick={() => onChange(mods.filter((m) => m !== mod))}
              >
                <X size={16} aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Text as="p" className="text-sm text-[color:var(--jd-muted)]">
          {floor.length > 0 ? "No more mods than the ones above." : "No mod in this cell."}
        </Text>
      )}
      {warnings.length > 0 && (
        <ul role="status" aria-label="Mods that clash" className="flex flex-col gap-1">
          {warnings.map((warning) => (
            <li key={warning} className="text-xs font-bold text-destructive">
              <Text>{warning}</Text>
            </li>
          ))}
        </ul>
      )}
      <CellModAdder catalog={catalog} full={mods.length >= MAX_MODS_PER_CELL} options={addable} onAdd={(mod) => onChange([...mods, mod])} />
    </section>
  );
}
