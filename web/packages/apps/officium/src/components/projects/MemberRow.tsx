"use client";

import { Link } from "@javadaba/ui/navigation";
import { Mail, UserRound, X } from "lucide-react";

import { Select } from "@javadaba/ui";

import type { BacklogRepository } from "../../lib/backlog/repository";
import type { Member, Role } from "../../lib/backlog/types";

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Viewer" },
];

/** One person in the Members dialog: their role, and the controls that change it (JDB-225). */
export function MemberRow({
  member: m,
  projectId,
  repository,
  onChanged,
}: {
  member: Member;
  projectId: string;
  repository: BacklogRepository;
  onChanged: () => Promise<void>;
}) {
  return (
    <li className="flex flex-row items-center gap-3 rounded-[var(--radius-jd-md)] border border-[color:var(--jd-line)] px-3 py-2">
      <UserRound size={16} className="shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{m.name}</p>
        <p className="flex flex-row min-w-0 items-center gap-1 truncate text-xs text-[color:var(--jd-muted)]">
          <Mail size={10} aria-hidden="true" /> {m.email}
        </p>
      </div>
      {m.role === "owner" || m.via === "team" ? (
        // Neither row is this dialog's to change: the owner can't be demoted or removed,
        // and a team's access is managed where the team is (contract §8.5). Controls
        // here would only answer "not found".
        <p className="shrink-0 text-right text-xs text-[color:var(--jd-muted)]">
          <span className="block font-semibold capitalize text-[color:var(--jd-ink)]">{m.role}</span>
          {m.via === "team" ? (
            <Link href="/app/configuration/organization" className="underline underline-offset-2">
              Through a team · manage in Organization
            </Link>
          ) : (
            "Owns the project"
          )}
        </p>
      ) : (
        <>
          <Select
            aria-label={`Role for ${m.name}`}
            value={m.role}
            onChange={(v) => void repository.updateMemberRole(projectId, m.accountId, v as Role).then(onChanged)}
            options={ROLE_OPTIONS}
            className="shrink-0"
          />
          <button
            type="button"
            onClick={() => void repository.removeMember(projectId, m.accountId).then(onChanged)}
            aria-label={`Remove ${m.name}`}
            className="flex flex-row size-11 shrink-0 items-center justify-center rounded-[var(--radius-jd-sm)] text-[color:var(--jd-muted)] hover:bg-[color:var(--jd-ink)]/[0.06] hover:text-destructive"
          >
            <X size={14} />
          </button>
        </>
      )}
    </li>
  );
}
