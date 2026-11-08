"use client";

import { Badge, Radio, Text } from "@javadaba/ui";

import { PHASE_LABEL, roleLabel } from "../../lib/backlog/role-config";
import type { Phase } from "../../lib/backlog/role-matrix-types";

/** The radio list of roles: the ones the phase usually gets first, then the rest. The current role is marked. */
export function RoleGroups({
  label,
  groups,
  picked,
  current,
  phase,
  onPick,
}: {
  label: string;
  groups: { usual: string[]; other: string[] };
  picked: string | null;
  current?: string;
  phase: Phase;
  onPick: (role: string) => void;
}) {
  const sections = [
    { heading: `Usually works ${PHASE_LABEL[phase]}`, roles: groups.usual },
    { heading: "Other roles", roles: groups.other },
  ].filter((section) => section.roles.length > 0);

  return (
    <div role="radiogroup" aria-label={label} className="flex min-w-0 flex-col gap-4">
      {sections.map((section) => (
        <div key={section.heading} className="flex flex-col gap-2">
          <Text className="text-xs font-bold uppercase text-[color:var(--jd-muted)]">{section.heading}</Text>
          {section.roles.map((role) => (
            <div
              key={role}
              data-role={role}
              className="flex min-h-11 flex-row items-center justify-between gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] p-3 hover:border-[color:var(--jd-control-border)]"
            >
              <Radio name={label} value={role} checked={picked === role} onChange={() => onPick(role)} description={<span className="font-mono">{role}</span>}>
                {roleLabel(role)}
              </Radio>
              {role === current && (
                <Badge register="tag" tone="info" fill="subtle" size="xs">
                  Current
                </Badge>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
