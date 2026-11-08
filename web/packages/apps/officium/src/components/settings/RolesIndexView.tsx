"use client";

import { useRef, useState } from "react";
import { Button, Input, Text } from "@javadaba/ui";

import { DEFAULT_ROLE_MATRIX, roleLabel } from "../../lib/backlog/role-config";
import { PHASES, mainPhase, roleSuggestions } from "../../lib/backlog/role-matrix";
import type { RoleSummary } from "../../lib/backlog/mod-types";
import { useModCatalog } from "../../lib/backlog/use-mods";
import { type RoleCatalog, useRoleCatalog } from "../../lib/backlog/use-roles";
import type { Phase } from "../../lib/backlog/types";
import { ConfigPage } from "../configuration/ConfigPage";
import { ModsIndexSection } from "./ModsIndexSection";
import { PREVIEW, RolePhaseSection } from "./RolePhaseSection";
import { KICKER, SectionHead } from "./SheetParts";
import { RolePhaseFilter, type PhaseChoice } from "./RolePhaseFilter";


/** The phase a role's catalog tags name (`phase-review`), when it has one. */
function phaseTagOf(role: RoleSummary | undefined): Phase | null {
  const tag = role?.tags.find((t) => t.startsWith("phase-"))?.slice("phase-".length);
  return PHASES.find((phase) => phase === tag) ?? null;
}

/** The roles the default matrix names, and the catalog's roles tagged `board` (card://JAVA-534): the board's own. */
function rolesOf(catalog: RoleCatalog): string[] {
  const board = catalog.state === "ready" ? catalog.roles.filter((r) => r.tags.includes("board")).map((r) => r.roleId) : [];
  return [...new Set([...roleSuggestions(DEFAULT_ROLE_MATRIX), ...board])].sort();
}

/** Where a role's row goes: the phase it works most in the default table, else its catalog tag, else Refine. */
function groupOf(role: string, entries: Map<string, RoleSummary>): Phase {
  return mainPhase(DEFAULT_ROLE_MATRIX, role) ?? phaseTagOf(entries.get(role)) ?? "refine";
}

/**
 * Roles, in Configuration (JAVA-519, rebuilt to JAVA-516's design by JAVA-517; JAVA-1626 moved it under
 * `/app/configuration`): every role, grouped by the phase it works most, each leading to its sheet. A
 * project's matrix is reached through Configuration's project selector, not from this page.
 */
export function RolesIndexView() {
  const [filter, setFilter] = useState("");
  const [phaseChoice, setPhaseChoice] = useState<PhaseChoice>("all");
  const [opened, setOpened] = useState<ReadonlySet<Phase>>(new Set());
  const filterField = useRef<HTMLInputElement>(null);
  const everyRoleHeading = useRef<HTMLHeadingElement>(null);
  const catalog = useRoleCatalog();
  // The same catalog read the Mods list below uses (one request per project): its length is the status line's mod count.
  const modCatalog = useModCatalog();
  const entries = new Map(catalog.state === "ready" ? catalog.roles.map((r) => [r.roleId, r] as const) : []);
  // TODO(backend): MIG-B044 the catalog read must serve all 49 roles (with their phase) and the 58 mods; until it does the
  // roles are the default table's plus the catalog's `board` ones, and the mod count is whatever the read returns.
  const roles = rolesOf(catalog);
  const query = filter.trim().toLowerCase();
  const shown = roles.filter(
    (role) =>
      (!query || roleLabel(role).toLowerCase().includes(query) || role.includes(query)) &&
      (phaseChoice === "all" || groupOf(role, entries) === phaseChoice),
  );

  return (
    <ConfigPage wide title="Roles" lede="Who can work a card, grouped by the phase each usually works. Read only.">
      <section aria-labelledby="roles-all" className="flex flex-col gap-6">
        <SectionHead id="roles-all" headingRef={everyRoleHeading}>Every role</SectionHead>
        {catalog.state === "none" && (
          <Text className="text-sm text-[color:var(--jd-muted)]">
            Roles are described through one of your projects. Create a project to see what each role does.
          </Text>
        )}
        {catalog.state === "error" && (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-4">
            <Text className="font-semibold">Couldn&apos;t load the descriptions</Text>
            <Text className="text-sm text-[color:var(--jd-muted)]">{catalog.message}</Text>
            <Button
              type="button"
              register="ui"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                // The button unmounts into the loading taglines: focus goes to the heading first (WCAG 2.4.3).
                everyRoleHeading.current?.focus();
                catalog.retry();
              }}
            >
              <Text>Try again</Text>
            </Button>
          </div>
        )}
        <div className="flex flex-row flex-wrap items-center gap-3">
          <Input
            ref={filterField}
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by name"
            aria-label="Filter roles by name"
            className="min-h-11 w-full sm:max-w-sm"
          />
          {/* A status message (WCAG 4.1.3): the count, and "0 of N" for no match, are announced as the filter changes. */}
          <Text role="status" className={KICKER}>{`${shown.length} of ${roles.length} roles${modCatalog.state === "ready" ? ` · ${modCatalog.mods.length} mods` : ""}`}</Text>
        </div>
        <RolePhaseFilter value={phaseChoice} onChange={setPhaseChoice} />
        {shown.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-[var(--radius-jd-lg)] border border-[color:var(--jd-line)] p-6">
            <Text className="font-semibold">{`No role matches "${filter.trim()}".`}</Text>
            <Text className="text-sm text-[color:var(--jd-muted)]">Try part of the name, like &quot;design&quot;.</Text>
            <Button
              type="button"
              register="ui"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                // The button unmounts with the no-match state: focus goes back to the field, not to the page.
                setFilter("");
                filterField.current?.focus();
              }}
            >
              <Text>Clear the filter</Text>
            </Button>
          </div>
        ) : (
          PHASES.map((phase) => {
            const inPhase = shown.filter((role) => groupOf(role, entries) === phase);
            if (inPhase.length === 0) return null;
            // Narrowed by a word or a phase, a phase shows everything it matched; otherwise it opens on a few.
            const folded = !query && phaseChoice === "all" && !opened.has(phase) && inPhase.length > PREVIEW;
            return (
              <RolePhaseSection
                key={phase}
                phase={phase}
                roles={inPhase}
                folded={folded}
                catalog={catalog}
                entries={entries}
                onShowAll={() => setOpened((prev) => new Set(prev).add(phase))}
              />
            );
          })
        )}
      </section>

      <ModsIndexSection />
    </ConfigPage>
  );
}
