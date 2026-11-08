"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input, Select, Text } from "@javadaba/ui";

import { describeQuota } from "../../lib/backlog/collaborator-quota";
import type { BacklogRepository } from "../../lib/backlog/repository";
import type { CollaboratorQuota, Member, Role } from "../../lib/backlog/types";
import { useReturnFocus } from "../../lib/backlog/use-return-focus";
import { FIELD_SELECT } from "../../lib/field-select";
import { CollaboratorQuotaLine } from "./CollaboratorQuotaLine";
import { IS_LOCAL } from "../../lib/edition";
import { CloudLocked } from "../cloud/CloudLocked";
import { MemberRow, ROLE_OPTIONS } from "./MemberRow";

const QUOTA_LINE_ID = "members-collaborator-quota";

/** Invite-by-email + role management, over `officium-api.md` §3's member operations
 *  (JDB-225 directive: "members panel per project"). The owner also sees how many collaborators
 *  the account includes, and at the cap the invite controls say why they are off (JAVA-1009). */
export function MembersDialog({
  projectId,
  repository,
  isOwner,
  onClose,
}: {
  projectId: string;
  repository: BacklogRepository;
  isOwner: boolean;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [quota, setQuota] = useState<CollaboratorQuota | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const returnFocus = useReturnFocus();

  const full = quota ? describeQuota(quota).full : false;

  async function refresh() {
    setMembers(await repository.listMembers(projectId));
    if (isOwner) setQuota(await repository.getCollaboratorQuota());
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function invite() {
    if (!email.trim() || full) return;
    try {
      await repository.inviteMember(projectId, { email: email.trim(), role });
    } catch (err) {
      // A refusal (the cap, a stale count, a read-only caller) shows the server's own sentence.
      setInviteError(err instanceof Error ? err.message : "The invitation was not sent.");
      await refresh();
      return;
    }
    setInviteError(null);
    setEmail("");
    await refresh();
  }

  // Officium Local has one owner: inviting people is Cloud's.
  if (IS_LOCAL) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent {...returnFocus} className="max-w-lg">
          <DialogTitle>Members</DialogTitle>
          <DialogDescription className="sr-only">Officium Local has one owner.</DialogDescription>
          <CloudLocked feature="members" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent {...returnFocus} className="max-w-lg">
        <DialogTitle>Members</DialogTitle>
        <DialogDescription>Invite people to this project and set what they can do.</DialogDescription>

        {quota ? <CollaboratorQuotaLine quota={quota} id={QUOTA_LINE_ID} /> : null}

        {/* Email, role and the action, one per line on a phone (JAVA-59). */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block text-xs font-bold uppercase text-[color:var(--jd-muted)]">Email</span>
            <Input
              type="email"
              value={email}
              disabled={full}
              aria-describedby={full ? QUOTA_LINE_ID : undefined}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") void invite();
              }}
            />
          </label>
          <Select
            aria-label="Role"
            value={role}
            disabled={full}
            onChange={(v) => setRole(v as Role)}
            options={ROLE_OPTIONS}
            className={`${FIELD_SELECT} sm:w-auto`}
          />
          <Button
            type="button"
            register="ui"
            size="sm"
            disabled={!email.trim() || full}
            aria-describedby={full ? QUOTA_LINE_ID : undefined}
            onClick={() => void invite()}
          >
            <Plus size={14} /> Invite
          </Button>
        </div>

        {inviteError ? (
          <p role="alert" className="text-sm font-semibold text-destructive">
            <Text>{inviteError}</Text>
          </p>
        ) : null}

        <ul className="flex flex-col gap-2 border-t border-[color:var(--jd-line)] pt-4">
          {members === null ? (
            <li className="text-sm text-[color:var(--jd-muted)]"><Text>Loading…</Text></li>
          ) : members.length === 0 ? (
            <li className="text-sm text-[color:var(--jd-muted)]"><Text>No members yet.</Text></li>
          ) : (
            members.map((m) => (
              <MemberRow key={m.accountId} member={m} projectId={projectId} repository={repository} onChanged={refresh} />
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
