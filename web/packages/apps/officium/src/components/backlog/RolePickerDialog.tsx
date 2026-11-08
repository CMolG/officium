"use client";

import { useState } from "react";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Text } from "@javadaba/ui";
import { Link } from "@javadaba/ui/navigation";

import { DEFAULT_ROLE_MATRIX, PHASE_LABEL, roleLabel, roleSheetHref } from "../../lib/backlog/role-config";
import { MAX_ROLES_PER_CELL, roleError, roleSuggestions, rolePhases } from "../../lib/backlog/role-matrix";
import type { Phase, RunCell, RunConfig } from "../../lib/backlog/role-matrix-types";
import { addRole, removeRole, replaceRole, rolePickerGroups } from "../../lib/backlog/cell-role-edit";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { useRoleCatalog } from "../../lib/backlog/use-roles";
import { RoleCatalogNotice } from "./RoleCatalogNotice";
import { RoleGroups } from "./RoleGroups";
import { RolePickerFooter } from "./RolePickerFooter";
import { RoleRunOverride } from "./RoleRunOverride";
import { RoleTypedField } from "./RoleTypedField";

/** The filter shows once a cell's picker has more roles than fit without scrolling a phone sheet. */
const FILTER_ABOVE = 8;
const SUGGESTIONS = roleSuggestions(DEFAULT_ROLE_MATRIX);

/** What a dialog saved: the cell's roles and its run, which the page applies to its draft. */
export interface RolePickerResult {
  roles: string[];
  run: RunCell | null;
}

/**
 * Replacing or adding a role in one cell (JAVA-1776; the pencil's editor did this inline before). Replace also takes
 * the role's own model and effort, which follow the slot, and removes the role from the cell. Save changes the page's
 * draft: nothing is written to the server from here.
 */
export function RolePickerDialog({
  title,
  phase,
  mode,
  current,
  roles,
  run,
  onSave,
  onClose,
}: {
  /** The cell's name, for the title: "Bug · Review". */
  title: string;
  phase: Phase;
  mode: "replace" | "add";
  /** The role being replaced (replace mode only). */
  current?: string;
  roles: string[];
  run: RunCell | null;
  onSave: (result: RolePickerResult) => void;
  onClose: () => void;
}) {
  const returnFocus = useReturnFocus();
  const catalog = useRoleCatalog();
  const [picked, setPicked] = useState<string | null>(current ?? null);
  const [typed, setTyped] = useState("");
  const [filter, setFilter] = useState("");
  const [own, setOwn] = useState<RunConfig | undefined>(current ? run?.roles?.[current] : undefined);
  const initialOwn = current ? run?.roles?.[current] : undefined;

  const selected = typed.trim() || picked;
  const others = roles.filter((role) => role !== current);
  const typedError = typed.trim() ? roleError(typed.trim(), others) : null;
  // The catalog's roles when they load, else the roles the default matrix names; the current one is always offered.
  const known = catalog.state === "ready" ? catalog.roles.map((r) => r.roleId) : [];
  const options = [...new Set([...known, ...SUGGESTIONS, ...(current ? [current] : [])])].sort();
  const query = filter.trim();
  const shown = options.filter((role) => !query || role.includes(query));
  const groups = rolePickerGroups(shown, others, (role) => rolePhases(DEFAULT_ROLE_MATRIX, role).includes(phase));
  const ownChanged = JSON.stringify(own ?? null) !== JSON.stringify(initialOwn ?? null);
  const full = mode === "add" && roles.length >= MAX_ROLES_PER_CELL;

  const replaceReason = !selected
    ? "Pick a role first."
    : selected === current && !ownChanged
      ? "Pick another role, or change its model."
      : typedError;
  const addReason = full ? `A cell holds at most ${MAX_ROLES_PER_CELL} roles.` : !selected ? "Pick a role first." : typedError;
  const reason = mode === "replace" ? replaceReason : addReason;

  function save() {
    if (!selected || reason !== null) return;
    if (mode === "add") onSave({ roles: addRole(roles, selected), run });
    else if (current) onSave(replaceRole(roles, run, current, selected, own));
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg overflow-hidden">
        <DialogTitle>{mode === "replace" && current ? `Replace ${roleLabel(current)} in ${title}` : `Add a role to ${title}`}</DialogTitle>
        <DialogDescription>
          {mode === "replace" && current ? (
            <>
              Now: {roleLabel(current)}. <Link href={roleSheetHref(current)} className="underline underline-offset-2">Read the {roleLabel(current)} sheet</Link>
            </>
          ) : (
            `The roles ${PHASE_LABEL[phase]} works with, from the roles Officium knows.`
          )}
        </DialogDescription>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          <RoleCatalogNotice catalog={catalog} />
          {options.length > FILTER_ABOVE && (
            <label className="flex flex-col gap-1.5">
              <Text className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">Find a role</Text>
              <Input value={filter} placeholder="qa" className="h-11" onChange={(e) => setFilter(e.target.value)} />
            </label>
          )}

          <RoleGroups
            label={mode === "replace" ? "Role to replace with" : "Role to add"}
            groups={groups}
            picked={selected}
            current={current}
            phase={phase}
            onPick={(role) => {
              setPicked(role);
              setTyped("");
            }}
          />

          {query && groups.usual.length + groups.other.length === 0 && (
            <div className="flex flex-row flex-wrap items-center gap-2">
              <Text className="min-w-0 flex-1 text-sm text-[color:var(--jd-muted)]">{`No role matches \`${query}\`.`}</Text>
              <Button type="button" register="ui" variant="ghost" size="sm" className="min-h-11" onClick={() => setFilter("")}>
                Clear filter
              </Button>
            </div>
          )}

          <RoleTypedField value={typed} error={typedError} onChange={setTyped} />

          {mode === "replace" && run && selected && (
            <RoleRunOverride role={selected} label={roleLabel(selected)} cell={run} own={own} onChange={setOwn} />
          )}
        </div>

        <RolePickerFooter
          mode={mode}
          reason={reason}
          saveDisabled={reason !== null}
          onRemove={mode === "replace" && current ? () => onSave(removeRole(roles, run, current)) : undefined}
          onSave={save}
        />
      </DialogContent>
    </Dialog>
  );
}
