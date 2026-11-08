package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.CardKeys;
import com.javadaba.contexts.officium.domain.DefinitionOfDone;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Project;
import com.javadaba.contexts.officium.domain.ProjectColor;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.FolderRepository;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * "The only place rules live" for projects (JDB-215): folders, key-prefix uniqueness (per owner),
 * archiving and optimistic concurrency. REST (and later MCP) are adapters over this.
 */
@ApplicationScoped
public class ProjectService {

    private static final Logger LOG = Logger.getLogger(ProjectService.class.getName());

    private final ProjectRepository projects;
    private final FolderRepository folders;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public ProjectService(ProjectRepository projects, FolderRepository folders, ProjectAccessGuard guard,
            ActivityPublisher activity) {
        this(projects, folders, guard, activity, Clock.systemUTC());
    }

    ProjectService(ProjectRepository projects, FolderRepository folders, ProjectAccessGuard guard,
            ActivityPublisher activity, Clock clock) {
        this.projects = projects;
        this.folders = folders;
        this.guard = guard;
        this.activity = activity;
        this.clock = clock;
    }

    public List<ProjectView> list(UUID accountId, UUID folderId, boolean filterByFolder, Boolean archived) {
        // The caller's real role, not "editor" for everything not owned: a viewer -- invited, or
        // through a team (JAVA-57) -- must not be offered writes the API will refuse.
        return projects.listForAccount(accountId, folderId, filterByFolder, archived).stream()
                .map(p -> ProjectView.of(p, p.ownerAccountId().equals(accountId)
                        ? Role.OWNER
                        : guard.requireAccess(p.id(), accountId).role()))
                .toList();
    }

    public ProjectView get(UUID accountId, UUID id) {
        ProjectAccessGuard.Access access = guard.requireAccess(id, accountId);
        return ProjectView.of(access.project(), access.role());
    }

    public ProjectView create(UUID ownerAccountId, String name, String keyPrefix, UUID folderId, Actor actor) {
        return create(ownerAccountId, name, keyPrefix, folderId, null, null, actor);
    }

    public ProjectView create(UUID ownerAccountId, String name, String keyPrefix, UUID folderId, String icon,
            String iconColor, Actor actor) {
        if (name == null || name.isBlank()) {
            throw OfficiumException.badRequest("name_required", "A project needs a name");
        }
        String prefix = keyPrefix == null ? null : keyPrefix.strip().toUpperCase(java.util.Locale.ROOT);
        if (!CardKeys.isValidPrefix(prefix)) {
            throw OfficiumException.badRequest("invalid_key_prefix",
                    "keyPrefix must match ^[A-Z][A-Z0-9]{1,9}$");
        }
        if (folderId != null) {
            folders.findById(folderId)
                    .filter(f -> f.ownerAccountId().equals(ownerAccountId))
                    .orElseThrow(() -> OfficiumException.notFound("folder_not_found", "No such folder"));
        }
        if (projects.existsKeyPrefix(ownerAccountId, prefix)) {
            throw OfficiumException.conflict("key_prefix_taken", "You already have a project with that key prefix");
        }
        Instant now = Instant.now(clock);
        Project saved = projects.insert(new Project(UUID.randomUUID(), ownerAccountId, folderId, name.strip(),
                prefix, icon == null ? null : validIcon(icon), iconColor == null ? null : validColor(iconColor), null,
                1, now, now));
        activity.record(saved.id(), null, null, actor, "project.created", "Project \"" + saved.name() + "\" created",
                now);
        return ProjectView.of(saved, Role.OWNER);
    }

    public ProjectView update(UUID accountId, UUID id, int expectedVersion, String name, UUID folderId,
            boolean changeFolder, Actor actor) {
        return update(accountId, id, expectedVersion, name, folderId, changeFolder, null, null, actor);
    }

    /**
     * {@code icon}/{@code iconColor} null = unchanged. Only the owner changes them (JAVA-51): they're
     * how the owner tells their projects apart, not something the project's content says.
     */
    public ProjectView update(UUID accountId, UUID id, int expectedVersion, String name, UUID folderId,
            boolean changeFolder, String icon, String iconColor, Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(id, accountId, Role.EDITOR);
        Project current = access.project();
        if ((icon != null || iconColor != null) && access.role() != Role.OWNER) {
            throw OfficiumException.forbidden("owner_only", "Only the project's owner changes its icon and color");
        }
        if (changeFolder && folderId != null) {
            folders.findById(folderId)
                    .filter(f -> f.ownerAccountId().equals(current.ownerAccountId()))
                    .orElseThrow(() -> OfficiumException.notFound("folder_not_found", "No such folder"));
        }
        Instant now = Instant.now(clock);
        Project desired = new Project(current.id(), current.ownerAccountId(),
                changeFolder ? folderId : current.folderId(),
                name != null && !name.isBlank() ? name.strip() : current.name(),
                current.keyPrefix(), icon == null ? current.icon() : validIcon(icon),
                iconColor == null ? current.iconColor() : validColor(iconColor), current.archivedAt(),
                current.version() + 1, current.createdAt(), now, current.formLanguages(),
                current.definitionOfDone(), current.isProtected());
        return applyVersioned(current, desired, expectedVersion, access.role(), actor, "project.updated",
                "Project updated");
    }

    /**
     * The languages every human card's form in this project is written in, the default first
     * (JAVA-1082); empty removes the requirement. The owner's call, like the icon: it is a rule for
     * everybody who writes a wall here.
     */
    public ProjectView setFormLanguages(UUID accountId, UUID id, int expectedVersion, List<String> languages,
            Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(id, accountId, Role.EDITOR);
        if (access.role() != Role.OWNER) {
            throw OfficiumException.forbidden("owner_only", "Only the project's owner sets its form languages");
        }
        Project current = access.project();
        Instant now = Instant.now(clock);
        Project desired = new Project(current.id(), current.ownerAccountId(), current.folderId(), current.name(),
                current.keyPrefix(), current.icon(), current.iconColor(), current.archivedAt(), current.version() + 1,
                current.createdAt(), now, FormLanguageCodes.valid(languages), current.definitionOfDone(),
                current.isProtected());
        return applyVersioned(current, desired, expectedVersion, access.role(), actor, "project.updated",
                "Form languages set to " + (desired.formLanguages().isEmpty() ? "none" : desired.formLanguages()));
    }

    /**
     * The standing Definition of Done every agent answers when it finishes a card here (JAVA-1446); empty removes the
     * checklist. The owner's call, like the form languages: a rule for everybody who finishes a card in the project.
     */
    public ProjectView setDefinitionOfDone(UUID accountId, UUID id, int expectedVersion, List<String> items,
            Actor actor) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(id, accountId, Role.EDITOR);
        if (access.role() != Role.OWNER) {
            throw OfficiumException.forbidden("owner_only", "Only the project's owner sets its definition of done");
        }
        Project current = access.project();
        Instant now = Instant.now(clock);
        List<String> checklist = DefinitionOfDone.valid(items);
        Project desired = new Project(current.id(), current.ownerAccountId(), current.folderId(), current.name(),
                current.keyPrefix(), current.icon(), current.iconColor(), current.archivedAt(), current.version() + 1,
                current.createdAt(), now, current.formLanguages(), checklist, current.isProtected());
        return applyVersioned(current, desired, expectedVersion, access.role(), actor, "project.updated",
                checklist.isEmpty() ? "Definition of done removed" : "Definition of done set: " + checklist);
    }

    public ProjectView archive(UUID accountId, UUID id, int expectedVersion, Actor actor) {
        return setArchived(accountId, id, expectedVersion, actor, true);
    }

    public ProjectView unarchive(UUID accountId, UUID id, int expectedVersion, Actor actor) {
        return setArchived(accountId, id, expectedVersion, actor, false);
    }

    private ProjectView setArchived(UUID accountId, UUID id, int expectedVersion, Actor actor, boolean archive) {
        ProjectAccessGuard.Access access = guard.requireAtLeast(id, accountId, Role.EDITOR);
        Project current = access.project();
        Instant now = Instant.now(clock);
        Project desired = new Project(current.id(), current.ownerAccountId(), current.folderId(), current.name(),
                current.keyPrefix(), current.icon(), current.iconColor(), archive ? now : null, current.version() + 1,
                current.createdAt(), now, current.formLanguages(), current.definitionOfDone(),
                current.isProtected());
        return applyVersioned(current, desired, expectedVersion, access.role(), actor,
                archive ? "project.archived" : "project.unarchived",
                archive ? "Project archived" : "Project unarchived");
    }

    /**
     * Deletes the project and everything in it, for everyone (JAVA-1554). Final, so it is the owner's
     * alone and the project's name must be typed, the same friction for an agent as for a person.
     */
    public void delete(UUID accountId, UUID id, String confirm) {
        ProjectAccessGuard.Access access = guard.requireAccess(id, accountId);
        if (access.role() != Role.OWNER) {
            throw OfficiumException.forbidden("owner_only", "Only the project's owner can delete it");
        }
        if (access.project().isProtected()) {
            // The database refuses the same delete; this answers it as a clean 409 before any SQL runs (JAVA-1853).
            LOG.warning("Refused to delete protected project " + id);
            throw OfficiumException.conflict("project_protected",
                    "This project is protected: it can never be deleted and its owner never changes");
        }
        String name = access.project().name();
        if (confirm == null || !confirm.strip().equals(name)) {
            throw OfficiumException.badRequest("confirmation_mismatch",
                    "Deleting a project is final: type its name (\"" + name + "\") to confirm");
        }
        if (!projects.delete(id)) {
            throw OfficiumException.notFound("project_not_found", "No such project");
        }
    }

    private static String validIcon(String icon) {
        if (!Project.isValidIcon(icon)) {
            throw OfficiumException.badRequest("invalid_icon", "An icon is a lucide name like \"folder-kanban\"");
        }
        return icon;
    }

    private static ProjectColor validColor(String iconColor) {
        try {
            return ProjectColor.fromWire(iconColor);
        } catch (IllegalArgumentException ex) {
            throw OfficiumException.badRequest("invalid_icon_color", "Unknown icon color: " + iconColor);
        }
    }

    private ProjectView applyVersioned(Project current, Project desired, int expectedVersion, Role role,
            Actor actor, String operation, String summary) {
        if (current.version() != expectedVersion) {
            throw new ProjectVersionConflictException(ProjectView.of(current, role));
        }
        boolean ok = projects.updateIfVersion(desired, expectedVersion);
        if (!ok) {
            Project fresh = projects.findById(current.id())
                    .orElseThrow(() -> OfficiumException.notFound("project_not_found", "No such project"));
            throw new ProjectVersionConflictException(ProjectView.of(fresh, role));
        }
        activity.record(desired.id(), null, null, actor, operation, summary, desired.updatedAt());
        activity.publish(operation, desired.id(), null, null, desired.version(), actor, desired.updatedAt());
        return ProjectView.of(desired, role);
    }
}
