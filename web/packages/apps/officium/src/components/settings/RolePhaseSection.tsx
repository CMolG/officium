"use client";

import { Link } from "@javadaba/ui/navigation";
import { Button, Text } from "@javadaba/ui";

import { DEFAULT_ROLE_MATRIX, PHASE_LABEL, PHASE_VERB, roleLabel, roleSheetHref } from "../../lib/backlog/role-config";
import { roleCells } from "../../lib/backlog/role-matrix";
import type { RoleSummary } from "../../lib/backlog/mod-types";
import type { Phase } from "../../lib/backlog/types";
import type { RoleCatalog } from "../../lib/backlog/use-roles";
import { MiniFingerprint } from "./RoleFingerprint";
import { RoleTagline } from "./RoleTagline";
import { KICKER } from "./SheetParts";

/** A phase lists this many roles until it is opened: the real catalog is long (Cfg-Reference, "The long index"). */
export const PREVIEW = 6;

/**
 * One phase of the roles index: how many roles it holds, the first few (or all, when a word or a phase narrowed the list)
 * and "Show all N" for the rest. Each role leads to its sheet and draws the fingerprint of the cells it works.
 */
export function RolePhaseSection({
  phase,
  roles,
  folded,
  catalog,
  entries,
  onShowAll,
}: {
  phase: Phase;
  roles: string[];
  folded: boolean;
  catalog: RoleCatalog;
  entries: Map<string, RoleSummary>;
  onShowAll: () => void;
}) {
  const listed = folded ? roles.slice(0, PREVIEW) : roles;
  return (
    <section aria-labelledby={`roles-${phase}`} className="flex flex-col gap-2.5">
      <h3 id={`roles-${phase}`} className={KICKER}>
        {`${PHASE_VERB[phase]} · ${PHASE_LABEL[phase]} · ${roles.length} ${roles.length === 1 ? "role" : "roles"}`}
      </h3>
      <ul className="flex flex-col border-t border-[color:var(--jd-line)]">
        {listed.map((role) => {
          const cells = roleCells(DEFAULT_ROLE_MATRIX, role).length;
          return (
            <li key={role} className="border-b border-[color:var(--jd-line)]">
              <Link
                href={roleSheetHref(role)}
                data-testid="role-entry"
                data-role={role}
                className="flex min-h-14 flex-row items-center gap-3.5 px-1 py-2.5 hover:bg-muted"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <Text className="font-bold">{roleLabel(role)}</Text>
                  <RoleTagline role={role} catalog={catalog} entries={entries} />
                </div>
                <MiniFingerprint matrix={DEFAULT_ROLE_MATRIX} role={role} />
                <Text className="w-16 shrink-0 text-right font-[family-name:var(--font-jd-kicker)] text-xs font-bold text-[color:var(--jd-muted)]">
                  {`${cells} ${cells === 1 ? "cell" : "cells"}`}
                </Text>
              </Link>
            </li>
          );
        })}
      </ul>
      {folded && (
        <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11 self-start" onClick={onShowAll}>
          <Text>{`Show all ${roles.length}`}</Text>
        </Button>
      )}
    </section>
  );
}
