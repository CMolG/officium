package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Nickname;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ports.AccountDirectory;
import com.javadaba.contexts.officium.domain.ports.NicknameRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * Nicknames per organization, and the label an agent writes under (JAVA-199, contract §8.5).
 *
 * <p>An organization is still the implicit one: the account that owns the projects. So a
 * project's organization is its owner, and a call that names no project is in the caller's own.
 * The nickname is only visual -- every actor keeps its {@code accountId}, and the email stays
 * behind it -- which is why a missing one falls back to the email's local part, not to nothing.
 */
@ApplicationScoped
public class NicknameService {

    private final NicknameRepository nicknames;
    private final ProjectRepository projects;
    private final AccountDirectory directory;
    private final OrganizationService organization;

    @Inject
    public NicknameService(NicknameRepository nicknames, ProjectRepository projects, AccountDirectory directory,
            OrganizationService organization) {
        this.nicknames = nicknames;
        this.projects = projects;
        this.directory = directory;
        this.organization = organization;
    }

    /**
     * The actor an MCP call writes as: "Claude Code (carlos97)" in the organization of
     * {@code projectId} (the caller's own when it is null or unknown -- a bad id is the operation's
     * to reject, not this label's).
     */
    public Actor agentActor(UUID accountId, String clientName, UUID projectId, String machine) {
        UUID organizationId = projectId == null
                ? accountId
                : projects.findById(projectId).map(Project::ownerAccountId).orElse(accountId);
        String owner = nicknames.find(organizationId, accountId).map(Nickname::value)
                .orElseGet(() -> emailLocalPart(accountId));
        return Actor.agent(accountId, Nickname.agentLabel(clientName, owner), machine);
    }

    /**
     * What other people see of this account in a project: its nickname in the project's organization,
     * else the email's local part, never the whole address.
     */
    public String displayName(UUID accountId, UUID projectId) {
        UUID organizationId = projects.findById(projectId).map(Project::ownerAccountId).orElse(accountId);
        String name = nicknames.find(organizationId, accountId).map(Nickname::value)
                .orElseGet(() -> emailLocalPart(accountId));
        return name == null || name.isBlank() ? "Someone" : name;
    }

    public NicknamesView view(UUID accountId, UUID organizationId) {
        requireMember(accountId, organizationId);
        List<NicknamesView.Entry> entries = nicknames.listByOrganization(organizationId).entrySet().stream()
                .map(e -> new NicknamesView.Entry(e.getKey(), e.getValue().value()))
                .sorted(Comparator.comparing(NicknamesView.Entry::nickname, String.CASE_INSENSITIVE_ORDER))
                .toList();
        String mine = nicknames.find(organizationId, accountId).map(Nickname::value).orElse(null);
        return new NicknamesView(organizationId, mine, entries);
    }

    /** Sets, or with a blank value clears, the caller's own nickname in that organization. */
    public NicknamesView setMine(UUID accountId, UUID organizationId, String value) {
        requireMember(accountId, organizationId);
        if (value == null || value.isBlank()) {
            nicknames.delete(organizationId, accountId);
        } else if (!nicknames.put(organizationId, accountId, new Nickname(value))) {
            throw OfficiumException.conflict("nickname_taken",
                    "Someone in this organization already goes by that nickname");
        }
        return view(accountId, organizationId);
    }

    /** Its owner, or anyone with access to one of its projects -- the same people Organization lists. */
    private void requireMember(UUID accountId, UUID organizationId) {
        if (organizationId.equals(accountId)) {
            return;
        }
        boolean member = organization.people(organizationId).stream()
                .anyMatch(person -> person.accountId().equals(accountId));
        if (!member) {
            throw OfficiumException.notFound("organization_not_found", "No such organization");
        }
    }

    private String emailLocalPart(UUID accountId) {
        return directory.findByAccountId(accountId)
                .map(AccountDirectory.Found::email)
                .filter(email -> email != null && !email.isBlank())
                .map(email -> email.contains("@") ? email.substring(0, email.indexOf('@')) : email)
                .orElse(null);
    }

    public record NicknamesView(UUID organizationId, String mine, List<Entry> nicknames) {

        public record Entry(UUID accountId, String nickname) {
        }
    }
}
