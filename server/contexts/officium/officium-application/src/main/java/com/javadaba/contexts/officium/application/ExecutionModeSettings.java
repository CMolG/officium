package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ExecutionMode;
import com.javadaba.contexts.officium.domain.ExecutionPreview;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.VersionConflict;
import com.javadaba.contexts.officium.domain.ports.CardLinkRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.ExecutionModeRepository;
import com.javadaba.contexts.officium.domain.ports.RoleCatalog;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * A project's execution mode (card://JAVA-1878, epic JAVA-1868): any member reads it, only the owner writes it, under
 * its version like the integration gate. No row reads as {@code card}, version 0, so a project that never chose one
 * runs exactly as before. A write can be a dry run: it answers the {@link ExecutionPreview} and stores nothing.
 */
@ApplicationScoped
public class ExecutionModeSettings {

    private final ExecutionModeRepository modes;
    private final CardRepository cards;
    private final CardLinkRepository links;
    private final RoleCatalog catalog;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final Clock clock;

    @Inject
    public ExecutionModeSettings(ExecutionModeRepository modes, CardRepository cards, CardLinkRepository links,
            RoleCatalog catalog, ProjectAccessGuard guard, ActivityPublisher activity) {
        this(modes, cards, links, catalog, guard, activity, Clock.systemUTC());
    }

    ExecutionModeSettings(ExecutionModeRepository modes, CardRepository cards, CardLinkRepository links,
            RoleCatalog catalog, ProjectAccessGuard guard, ActivityPublisher activity, Clock clock) {
        this.modes = modes;
        this.cards = cards;
        this.links = links;
        this.catalog = catalog;
        this.guard = guard;
        this.activity = activity;
        this.clock = clock;
    }

    public SettingsView get(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return view(projectId);
    }

    /** The mode the project's cards run under. No access check: callers already made it. */
    public ExecutionMode effective(UUID projectId) {
        return modes.find(projectId).map(ExecutionModeRepository.Stored::mode).orElse(ExecutionMode.CARD);
    }

    /**
     * Replaces the mode under {@code expectedVersion}, the owner only, and answers what it does to the open cards. With
     * {@code dryRun} nothing is stored: the answer is the setting as it stands and the preview of {@code mode}.
     */
    public SetView set(UUID accountId, UUID projectId, ExecutionMode mode, int expectedVersion, boolean dryRun,
            Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        SettingsView current = view(projectId);
        if (current.version() != expectedVersion) {
            throw new ExecutionModeVersionConflictException(current);
        }
        if (mode.epic() && catalog.find(mode.implementerRole()).isEmpty()) {
            throw new OfficiumException("unknown_role", "Fluxor's catalog has no role " + mode.implementerRole()
                    + ": name a board role of the Action phase as implementerRole", 422);
        }
        ExecutionPreview preview = ExecutionPreview.of(mode, cards.findAllByProject(projectId),
                links.findAllBlocksEdges(projectId));
        if (dryRun) {
            return new SetView(current, preview, false);
        }
        Instant now = Instant.now(clock);
        if (!modes.saveIfVersion(projectId, mode, actor, expectedVersion, now)) {
            throw new ExecutionModeVersionConflictException(view(projectId));
        }
        activity.record(projectId, null, null, actor, "project.executionMode", "Execution mode set to "
                + mode.mode().wire() + (mode.epic() ? " (implementer " + mode.implementerRole() + ")" : ""), now);
        activity.publish("project.executionMode", projectId, null, null, expectedVersion + 1, actor, now);
        return new SetView(view(projectId), preview, true);
    }

    private SettingsView view(UUID projectId) {
        return modes.find(projectId)
                .map(stored -> new SettingsView(stored.mode().mode().wire(), stored.mode().implementerRole(),
                        stored.version(), stored.updatedAt()))
                .orElse(new SettingsView(ExecutionMode.CARD.mode().wire(), ExecutionMode.CARD.implementerRole(), 0,
                        null));
    }

    /** {@code {mode, implementerRole, version, updatedAt}}: version 0 is a project that never set it. */
    public record SettingsView(String mode, String implementerRole, int version, Instant updatedAt) {
    }

    /** {@code applied} is false on a dry run, whose {@code setting} is the one still in force. */
    public record SetView(SettingsView setting, ExecutionPreview preview, boolean applied) {
    }

    /** {@code 409 {error:"version_conflict", message, current:<SettingsView>}}. */
    public static class ExecutionModeVersionConflictException extends OfficiumException implements VersionConflict {

        private final SettingsView current;

        ExecutionModeVersionConflictException(SettingsView current) {
            super("version_conflict", "The project's execution mode changed since you last read it", 409);
            this.current = current;
        }

        @Override
        public SettingsView current() {
            return current;
        }
    }
}
