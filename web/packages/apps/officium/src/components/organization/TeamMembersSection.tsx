"use client";

import { Avatar, Button, Input, Note, Text } from "@javadaba/ui";
import { Plus } from "lucide-react";

import type { Team } from "../../lib/backlog/types";

/** The "Members" block of a team: add by email (the directory's errors in words), and each member with Remove. */
export function TeamMembersSection({
  team,
  email,
  onEmail,
  error,
  onAdd,
  onRemove,
}: {
  team: Team;
  email: string;
  onEmail: (value: string) => void;
  error: string | null;
  onAdd: () => void;
  onRemove: (member: Team["members"][number]) => void;
}) {
  return (
    <div>
      <h3 className="mb-1.5 text-xs font-bold uppercase text-[color:var(--jd-muted)]">Members</h3>
      <div className="flex flex-row items-end gap-2">
        <label className="min-w-0 flex-1">
          <Input
            type="email"
            aria-label="Member email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            placeholder="name@example.com"
            onKeyDown={(e) => {
              if (e.key === "Enter") onAdd();
            }}
          />
        </label>
        <Button type="button" register="ui" size="sm" disabled={!email.trim()} onClick={() => onAdd()}>
          <Plus size={14} /> Add
        </Button>
      </div>
      {error && (
        <div className="mt-2">
          <Note tone="danger">{error}</Note>
        </div>
      )}
      <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
        {team.members.length === 0 ? (
          <li className="text-sm text-[color:var(--jd-muted)]">
            <Text>No members yet.</Text>
          </li>
        ) : (
          team.members.map((m) => (
            <li key={m.accountId} className="flex flex-row items-center gap-2 rounded-xl bg-[color:var(--jd-card)] px-3 py-2 text-sm">
              <Avatar name={m.name} size="s" />
              <span className="min-w-0 flex-1 truncate">
                {m.name} <span className="text-xs text-[color:var(--jd-muted)]">{m.email}</span>
              </span>
              <Button type="button" register="ui" variant="ghost" size="sm" aria-label={`Remove ${m.name}`} onClick={() => onRemove(m)}>
                Remove
              </Button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
