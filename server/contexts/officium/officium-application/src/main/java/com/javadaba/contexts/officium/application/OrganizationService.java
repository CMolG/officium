package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.OrganizationViews.PersonProjectView;
import com.javadaba.contexts.officium.application.OrganizationViews.PersonView;
import com.javadaba.contexts.officium.application.OrganizationViews.TeamMemberView;
import com.javadaba.contexts.officium.application.OrganizationViews.TeamProjectView;
import com.javadaba.contexts.officium.application.OrganizationViews.TeamRef;
import com.javadaba.contexts.officium.application.OrganizationViews.TeamView;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CollaboratorQuota;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ProjectMember;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Team;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.ports.InvitationMailer;
import com.javadaba.contexts.officium.domain.ports.ProjectMemberRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import com.javadaba.contexts.officium.domain.ports.TeamRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Organization (JAVA-57, contract §8.5): the people with access to the projects an account owns,
 * and the teams it uses to grant that access in one step. Every team is its owner's alone: someone
 * else's team is "not found", the same rule as a project.
 */
@ApplicationScoped
public class OrganizationService {

    private final TeamRepository teams;
    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final AccountDirectory directory;
    private final ActivityPublisher activity;
    private final DocReadingHistory readingHistory;
    private final CollaboratorQuotaService collaboratorQuota;
    private final InvitationDelivery delivery;
    private final Clock clock;

    @Inject
    public OrganizationService(TeamRepository teams, ProjectRepository projects, ProjectMemberRepository members,
            AccountDirectory directory, ActivityPublisher activity, DocReadingHistory readingHistory,
            CollaboratorQuotaService collaboratorQuota, InvitationDelivery delivery) {
        this(teams, projects, members, directory, activity, readingHistory, collaboratorQuota, delivery,
                Clock.systemUTC());
    }

    OrganizationService(TeamRepository teams, ProjectRepository projects, ProjectMemberRepository members,
            AccountDirectory directory, ActivityPublisher activity, DocReadingHistory readingHistory,
            CollaboratorQuotaService collaboratorQuota, InvitationDelivery delivery, Clock clock) {
        this.teams = teams;
        this.projects = projects;
        this.members = members;
        this.directory = directory;
        this.activity = activity;
        this.readingHistory = readingHistory;
        this.collaboratorQuota = collaboratorQuota;
        this.delivery = delivery;
        this.clock = clock;
    }

    /** The collaborators the caller includes and the cap, for the caller's own account alone. */
    public CollaboratorQuota collaborators(UUID accountId) {
        return collaboratorQuota.quotaOf(accountId);
    }

    /** Everyone with access to a project the caller owns, the caller excepted, with how they got it. */
    public List<PersonView> people(UUID accountId) {
        Map<UUID, List<PersonProjectView>> projectsByPerson = new LinkedHashMap<>();
        Map<UUID, Map<UUID, TeamRef>> teamsByPerson = new LinkedHashMap<>();
        for (Project project : projects.listOwnedBy(accountId)) {
            for (ProjectMember member : members.listByProject(project.id())) {
                projectsByPerson.computeIfAbsent(member.accountId(), k -> new ArrayList<>())
                        .add(new PersonProjectView(project.id(), project.name(), project.keyPrefix(),
                                member.role().wire(), MemberView.DIRECT, null));
            }
            for (TeamRepository.ProjectGrant grant : teams.grantsOnProject(project.id())) {
                projectsByPerson.computeIfAbsent(grant.accountId(), k -> new ArrayList<>())
                        .add(new PersonProjectView(project.id(), project.name(), project.keyPrefix(),
                                grant.role().wire(), MemberView.TEAM, grant.teamId()));
                teamsByPerson.computeIfAbsent(grant.accountId(), k -> new LinkedHashMap<>())
                        .put(grant.teamId(), new TeamRef(grant.teamId(), grant.teamName()));
            }
        }
        // A member of a team that grants nothing yet still belongs to it.
        for (Team team : teams.listByOwner(accountId)) {
            for (Team.Member member : teams.members(team.id())) {
                projectsByPerson.computeIfAbsent(member.accountId(), k -> new ArrayList<>());
                teamsByPerson.computeIfAbsent(member.accountId(), k -> new LinkedHashMap<>())
                        .put(team.id(), new TeamRef(team.id(), team.name()));
            }
        }
        projectsByPerson.remove(accountId);
        List<PersonView> result = new ArrayList<>();
        for (Map.Entry<UUID, List<PersonProjectView>> entry : projectsByPerson.entrySet()) {
            AccountDirectory.Found found = resolve(entry.getKey());
            result.add(new PersonView(entry.getKey(), found.email(), found.name(), entry.getValue(),
                    List.copyOf(teamsByPerson.getOrDefault(entry.getKey(), Map.of()).values())));
        }
        result.sort(Comparator.comparing(p -> (p.name() == null || p.name().isBlank() ? p.email() : p.name())
                .toLowerCase(java.util.Locale.ROOT)));
        return result;
    }

    public List<TeamView> list(UUID accountId) {
        return teams.listByOwner(accountId).stream().map(this::view).toList();
    }

    public TeamView create(UUID accountId, String name, String description, Actor actor) {
        Instant now = Instant.now(clock);
        return view(teams.insert(new Team(UUID.randomUUID(), accountId, name, description, 1, now, now)));
    }

    public TeamView update(UUID accountId, UUID teamId, int expectedVersion, String name, String description,
            Actor actor) {
        Team current = require(accountId, teamId);
        if (current.version() != expectedVersion) {
            throw new TeamVersionConflictException(view(current));
        }
        Team desired = current.edited(name, description, Instant.now(clock));
        if (!teams.updateIfVersion(desired, expectedVersion)) {
            throw new TeamVersionConflictException(view(require(accountId, teamId)));
        }
        return view(desired);
    }

    /** Everything the team granted goes with it; nobody's direct membership does. */
    public void delete(UUID accountId, UUID teamId, int expectedVersion, Actor actor) {
        Team current = require(accountId, teamId);
        List<Team.Grant> granted = teams.grants(teamId);
        List<Team.Member> leaving = teams.members(teamId);
        if (!teams.deleteIfVersion(teamId, expectedVersion)) {
            throw new TeamVersionConflictException(view(current));
        }
        readingHistory.forgetLeavers(granted.stream().map(Team.Grant::projectId).toList(),
                leaving.stream().map(Team.Member::accountId).toList());
        Instant now = Instant.now(clock);
        for (Team.Grant grant : granted) {
            changed(grant.projectId(), actor, "Team \"" + current.name() + "\" deleted", now);
        }
    }

    public TeamView addMember(UUID accountId, UUID teamId, String email, Actor actor) {
        Team team = require(accountId, teamId);
        AccountDirectory.Found found = ProjectMembershipService.resolveUnambiguousAccount(directory, email);
        if (found.accountId().equals(accountId)) {
            throw OfficiumException.conflict("already_owner", "You own the team's projects already");
        }
        // A team that grants nothing gives no access, so its new member is not counted yet.
        if (!teams.grants(teamId).isEmpty()) {
            collaboratorQuota.requireRoomFor(accountId, List.of(found.accountId()));
        }
        Instant now = Instant.now(clock);
        if (!teams.addMember(new Team.Member(teamId, found.accountId(), now))) {
            throw OfficiumException.conflict("already_member", "That account is already in the team");
        }
        List<Team.Grant> grants = teams.grants(teamId);
        for (Team.Grant grant : grants) {
            changed(grant.projectId(), actor, found.email() + " joined team \"" + team.name() + "\"", now);
        }
        // A team mail goes only when the team grants at least one project: that is what it names.
        List<InvitationMailer.Access> access = grants.stream()
                .flatMap(grant -> projects.findById(grant.projectId()).stream()
                        .map(p -> new InvitationMailer.Access(p.id(), p.name(), grant.role())))
                .toList();
        if (!access.isEmpty()) {
            delivery.toTeam(actor, resolve(accountId), found, team.id(), team.name(), access, now);
        }
        return view(team);
    }

    public TeamView removeMember(UUID accountId, UUID teamId, UUID memberAccountId, Actor actor) {
        Team team = require(accountId, teamId);
        if (!teams.removeMember(teamId, memberAccountId)) {
            throw OfficiumException.notFound("member_not_found", "No such team member");
        }
        List<Team.Grant> granted = teams.grants(teamId);
        readingHistory.forgetLeavers(granted.stream().map(Team.Grant::projectId).toList(), List.of(memberAccountId));
        Instant now = Instant.now(clock);
        for (Team.Grant grant : granted) {
            changed(grant.projectId(), actor, "A member left team \"" + team.name() + "\"", now);
        }
        return view(team);
    }

    /** Grants one of the caller's own projects to the team, or changes the role it grants. */
    public TeamView grantProject(UUID accountId, UUID teamId, UUID projectId, Role role, Actor actor) {
        Team team = require(accountId, teamId);
        Project project = requireOwnedProject(accountId, projectId);
        collaboratorQuota.requireRoomFor(accountId,
                teams.members(teamId).stream().map(Team.Member::accountId).toList());
        Instant now = Instant.now(clock);
        teams.grant(new Team.Grant(teamId, project.id(), Team.requireGrantable(role), now));
        changed(project.id(), actor, "Team \"" + team.name() + "\" granted " + role.wire(), now);
        return view(team);
    }

    public TeamView revokeProject(UUID accountId, UUID teamId, UUID projectId, Actor actor) {
        Team team = require(accountId, teamId);
        requireOwnedProject(accountId, projectId);
        if (!teams.revoke(teamId, projectId)) {
            throw OfficiumException.notFound("project_not_found", "The team isn't granted that project");
        }
        readingHistory.forgetLeavers(List.of(projectId),
                teams.members(teamId).stream().map(Team.Member::accountId).toList());
        changed(projectId, actor, "Team \"" + team.name() + "\" no longer has access", Instant.now(clock));
        return view(team);
    }

    private void changed(UUID projectId, Actor actor, String summary, Instant at) {
        activity.record(projectId, null, null, actor, "member.team", summary, at);
        activity.publish("member.changed", projectId, null, null, null, actor, at);
    }

    private Team require(UUID accountId, UUID teamId) {
        return teams.findById(teamId).filter(t -> t.ownerAccountId().equals(accountId))
                .orElseThrow(() -> OfficiumException.notFound("team_not_found", "No such team"));
    }

    private Project requireOwnedProject(UUID accountId, UUID projectId) {
        return projects.findById(projectId).filter(p -> p.ownerAccountId().equals(accountId))
                .orElseThrow(() -> OfficiumException.notFound("project_not_found", "No such project"));
    }

    private TeamView view(Team team) {
        List<TeamMemberView> memberViews = teams.members(team.id()).stream().map(m -> {
            AccountDirectory.Found found = resolve(m.accountId());
            return new TeamMemberView(m.accountId(), found.email(), found.name(), m.addedAt());
        }).toList();
        List<TeamProjectView> projectViews = new ArrayList<>();
        for (Team.Grant grant : teams.grants(team.id())) {
            projects.findById(grant.projectId()).ifPresent(p -> projectViews.add(new TeamProjectView(p.id(), p.name(),
                    p.keyPrefix(), p.icon(), p.iconColor().wire(), grant.role().wire())));
        }
        return new TeamView(team.id(), team.name(), team.description(), team.version(), team.createdAt(),
                team.updatedAt(), memberViews, projectViews);
    }

    private AccountDirectory.Found resolve(UUID accountId) {
        return directory.findByAccountId(accountId).orElse(new AccountDirectory.Found(accountId, "", ""));
    }
}
