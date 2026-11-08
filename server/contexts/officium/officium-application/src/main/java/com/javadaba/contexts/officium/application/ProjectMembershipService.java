package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ProjectMember;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.ports.ProjectMemberRepository;
import com.javadaba.contexts.officium.domain.ports.TeamRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Invite-by-email, role changes and removal (JDB-215). Only the owner manages membership -- v1
 * has no "editor invites another editor" story in the contract, and keeping it owner-only avoids
 * a privilege-escalation path (an editor promoting themselves to owner-equivalent access).
 */
@ApplicationScoped
public class ProjectMembershipService {

    private final ProjectMemberRepository members;
    private final ProjectAccessGuard guard;
    private final AccountDirectory directory;
    private final ActivityPublisher activity;
    private final TeamRepository teams;
    private final DocReadingHistory readingHistory;
    private final CollaboratorQuotaService collaboratorQuota;
    private final InvitationDelivery delivery;
    private final Clock clock;

    @Inject
    public ProjectMembershipService(ProjectMemberRepository members, ProjectAccessGuard guard,
            AccountDirectory directory, ActivityPublisher activity, TeamRepository teams,
            DocReadingHistory readingHistory, CollaboratorQuotaService collaboratorQuota,
            InvitationDelivery delivery) {
        this(members, guard, directory, activity, teams, readingHistory, collaboratorQuota, delivery,
                Clock.systemUTC());
    }

    ProjectMembershipService(ProjectMemberRepository members, ProjectAccessGuard guard, AccountDirectory directory,
            ActivityPublisher activity, TeamRepository teams, DocReadingHistory readingHistory,
            CollaboratorQuotaService collaboratorQuota, InvitationDelivery delivery, Clock clock) {
        this.members = members;
        this.guard = guard;
        this.directory = directory;
        this.activity = activity;
        this.teams = teams;
        this.readingHistory = readingHistory;
        this.collaboratorQuota = collaboratorQuota;
        this.delivery = delivery;
        this.clock = clock;
    }

    public List<MemberView> list(UUID callerAccountId, UUID projectId) {
        ProjectAccessGuard.Access access = guard.requireAccess(projectId, callerAccountId);
        List<MemberView> result = new ArrayList<>();
        AccountDirectory.Found owner = resolve(access.project().ownerAccountId());
        result.add(new MemberView(owner.accountId(), owner.email(), owner.name(), Role.OWNER.wire(),
                access.project().createdAt()));
        java.util.Set<UUID> listed = new java.util.HashSet<>();
        listed.add(owner.accountId());
        for (ProjectMember member : members.listByProject(projectId)) {
            AccountDirectory.Found found = resolve(member.accountId());
            result.add(MemberView.of(member, found.email(), found.name()));
            listed.add(member.accountId());
        }
        // One row per person: someone invited directly is listed as such, and a team member once, under
        // the team that grants the most (grantsOnProject comes team by team; keep the best).
        java.util.Map<UUID, TeamRepository.ProjectGrant> bestByAccount = new java.util.LinkedHashMap<>();
        for (TeamRepository.ProjectGrant grant : teams.grantsOnProject(projectId)) {
            if (!listed.contains(grant.accountId())) {
                bestByAccount.merge(grant.accountId(), grant,
                        (a, b) -> b.role().ordinal() < a.role().ordinal() ? b : a);
            }
        }
        for (TeamRepository.ProjectGrant grant : bestByAccount.values()) {
            AccountDirectory.Found found = resolve(grant.accountId());
            result.add(new MemberView(grant.accountId(), found.email(), found.name(), grant.role().wire(), null,
                    MemberView.TEAM, grant.teamId()));
        }
        return result;
    }

    public MemberView invite(UUID callerAccountId, UUID projectId, String email, Role role, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(projectId, callerAccountId, Role.OWNER);
        AccountDirectory.Found found = resolveUnambiguousAccount(email);
        if (access.project().ownerAccountId().equals(found.accountId())) {
            throw OfficiumException.conflict("already_owner", "That account already owns the project");
        }
        if (members.find(projectId, found.accountId()).isPresent()) {
            throw OfficiumException.conflict("already_member", "That account is already a member");
        }
        collaboratorQuota.requireRoomFor(access.project().ownerAccountId(), List.of(found.accountId()));
        Instant now = Instant.now(clock);
        ProjectMember saved = members.insert(new ProjectMember(projectId, found.accountId(), role, now));
        activity.record(projectId, null, null, actor, "member.added", found.email() + " invited as " + role.wire(),
                now);
        activity.publish("member.changed", projectId, null, null, null, actor, now);
        delivery.toProject(actor, resolve(callerAccountId), found, access.project(), role, now);
        return MemberView.of(saved, found.email(), found.name());
    }

    public MemberView changeRole(UUID callerAccountId, UUID projectId, UUID targetAccountId, Role role, Actor actor) {
        guard.requireAtLeast(projectId, callerAccountId, Role.OWNER);
        ProjectMember existing = members.find(projectId, targetAccountId)
                .orElseThrow(() -> OfficiumException.notFound("member_not_found", "No such member"));
        members.updateRole(projectId, targetAccountId, role);
        Instant now = Instant.now(clock);
        activity.record(projectId, null, null, actor, "member.role_changed", "Role changed to " + role.wire(), now);
        activity.publish("member.changed", projectId, null, null, null, actor, now);
        AccountDirectory.Found found = resolve(targetAccountId);
        return new MemberView(targetAccountId, found.email(), found.name(), role.wire(), existing.createdAt());
    }

    public void remove(UUID callerAccountId, UUID projectId, UUID targetAccountId, Actor actor) {
        guard.requireAtLeast(projectId, callerAccountId, Role.OWNER);
        members.find(projectId, targetAccountId)
                .orElseThrow(() -> OfficiumException.notFound("member_not_found", "No such member"));
        members.remove(projectId, targetAccountId);
        readingHistory.forgetLeavers(List.of(projectId), List.of(targetAccountId));
        Instant now = Instant.now(clock);
        activity.record(projectId, null, null, actor, "member.removed", "Member removed", now);
        activity.publish("member.changed", projectId, null, null, null, actor, now);
    }

    private AccountDirectory.Found resolve(UUID accountId) {
        return directory.findByAccountId(accountId).orElse(new AccountDirectory.Found(accountId, "", ""));
    }

    /**
     * The directory is best-effort (an account's {@code name} is the email at signup time, not a
     * verified, unique index -- see {@code OrganizationRepository#findAllByName}): two accounts
     * can share a display name, one from an unverified email/password signup. Rather than invite
     * whichever row a query happens to return first, more than one match refuses outright
     * ({@code ambiguous_account}, 409) -- 2026-09-14 hardening. The remaining risk this does NOT
     * close: a single unverified signup can still claim someone else's email as its display name
     * and be the ONLY match, so the directory alone is not proof of ownership (contract §3 note).
     */
    private AccountDirectory.Found resolveUnambiguousAccount(String email) {
        return resolveUnambiguousAccount(directory, email);
    }

    /** Shared with {@code OrganizationService}: a team member is added by email under the same rule. */
    static AccountDirectory.Found resolveUnambiguousAccount(AccountDirectory directory, String email) {
        List<AccountDirectory.Found> matches = directory.findAllByEmail(email);
        if (matches.isEmpty()) {
            throw OfficiumException.notFound("account_not_found", "No Javadaba account with that email");
        }
        if (matches.size() > 1) {
            throw OfficiumException.conflict("ambiguous_account",
                    "More than one account matches that email; ask them to sign in and confirm their account id");
        }
        return matches.get(0);
    }
}
