package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Entitlements;
import com.javadaba.contexts.officium.domain.ExecutionMode;
import com.javadaba.contexts.officium.domain.ImplementerMatrix;
import com.javadaba.contexts.officium.domain.ModMatrix;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.RunMatrix;
import com.javadaba.contexts.officium.domain.RunShuffle;
import com.javadaba.contexts.officium.domain.VersionConflict;
import com.javadaba.contexts.officium.domain.WorkProfile;
import com.javadaba.contexts.officium.domain.WorkProfiles;
import com.javadaba.contexts.officium.domain.ports.AccountEntitlements;
import com.javadaba.contexts.officium.domain.ports.ProjectRepository;
import com.javadaba.contexts.officium.domain.ports.RoleCatalog;
import com.javadaba.contexts.officium.domain.ports.RoleMatrixRepository;
import com.javadaba.contexts.officium.domain.ports.WorkProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Which roles may work a project's cards (JAVA-294): the default {@link RoleMatrix}, then the work profile the
 * owner activated (card://JAVA-1524), then the project's own override on top. The override is JAVA-243's
 * per-project setting, so only the owner writes it, like the project's other settings.
 */
@ApplicationScoped
public class RoleMatrixService {

    private final RoleMatrixRepository matrices;
    private final WorkProfileRepository profiles;
    private final ProjectRepository projects;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final RoleCatalog catalog;
    private final AccountEntitlements entitlements;
    private final ExecutionModeSettings executionModes;
    private final Clock clock;

    @Inject
    public RoleMatrixService(RoleMatrixRepository matrices, WorkProfileRepository profiles, ProjectRepository projects,
            ProjectAccessGuard guard, ActivityPublisher activity, RoleCatalog catalog,
            AccountEntitlements entitlements, ExecutionModeSettings executionModes) {
        this(matrices, profiles, projects, guard, activity, catalog, entitlements, executionModes, Clock.systemUTC());
    }

    /** A service with no execution mode to read: every project executes card by card. */
    public RoleMatrixService(RoleMatrixRepository matrices, WorkProfileRepository profiles, ProjectRepository projects,
            ProjectAccessGuard guard, ActivityPublisher activity, RoleCatalog catalog,
            AccountEntitlements entitlements) {
        this(matrices, profiles, projects, guard, activity, catalog, entitlements, null, Clock.systemUTC());
    }

    RoleMatrixService(RoleMatrixRepository matrices, WorkProfileRepository profiles, ProjectRepository projects,
            ProjectAccessGuard guard, ActivityPublisher activity, RoleCatalog catalog,
            AccountEntitlements entitlements, Clock clock) {
        this(matrices, profiles, projects, guard, activity, catalog, entitlements, null, clock);
    }

    RoleMatrixService(RoleMatrixRepository matrices, WorkProfileRepository profiles, ProjectRepository projects,
            ProjectAccessGuard guard, ActivityPublisher activity, RoleCatalog catalog,
            AccountEntitlements entitlements, ExecutionModeSettings executionModes, Clock clock) {
        this.matrices = matrices;
        this.profiles = profiles;
        this.projects = projects;
        this.guard = guard;
        this.activity = activity;
        this.catalog = catalog;
        this.entitlements = entitlements;
        this.executionModes = executionModes;
        this.clock = clock;
    }

    /**
     * The matrix a project's cards are read against. No access check: callers already made it. The owner's
     * entitlements are read only when the project keeps an override, so a free project costs no extra read. A project
     * that executes by epic gets its implementer on every action cell last (card://JAVA-1875).
     */
    public RoleMatrix effective(UUID projectId) {
        RoleMatrix base = base(projectId);
        return withMode(projectId, matrices.find(projectId)
                .map(stored -> base.overlay(kept(projectId, stored.overrides()))).orElse(base));
    }

    private RoleMatrix withMode(UUID projectId, RoleMatrix matrix) {
        ExecutionMode mode = executionMode(projectId);
        return mode.epic() ? ImplementerMatrix.apply(matrix, mode.implementerRole()) : matrix;
    }

    /** How the project's agents execute its cards: {@code card} for a project that never chose. */
    public ExecutionMode executionMode(UUID projectId) {
        return executionModes == null ? ExecutionMode.CARD : executionModes.effective(projectId);
    }

    /** The execution mode's settings, which the MCP table reaches through this service (card://JAVA-1878). */
    public ExecutionModeSettings executionModes() {
        return executionModes;
    }

    /**
     * Shuffle mode over {@code matrix}, the project's effective one (card://JAVA-1858): off unless the project's active
     * profile has it on.
     */
    public RunShuffle shuffle(UUID projectId, RoleMatrix matrix) {
        return profiles.active(projectId).filter(WorkProfileRepository.Active::shuffle)
                .map(active -> RunShuffle.over(matrix)).orElse(RunShuffle.OFF);
    }

    /** The matrix under the project's own cells: its active profile's, or Officium's defaults. */
    private RoleMatrix base(UUID projectId) {
        return activeProfile(projectId).map(WorkProfile::matrix).orElse(RoleMatrix.defaults());
    }

    /**
     * The profile the project's owner activated, as that owner keeps it (a built-in they never edited, as shipped).
     * Once the owner's plan no longer covers editing, a built-in reads as shipped and a customized one as absent
     * (JAVA-1007): the copy is kept, and comes back on re-subscribing.
     */
    public Optional<WorkProfile> activeProfile(UUID projectId) {
        return profiles.active(projectId).flatMap(active -> editing(projectId).full()
                ? profiles.find(active.accountId(), active.profileId())
                        .or(() -> WorkProfiles.builtin(active.profileId()))
                : WorkProfiles.builtin(active.profileId()));
    }

    /** {@code overrides} without the parts the project's owner may no longer edit (JAVA-1007). */
    private RoleMatrix kept(UUID projectId, RoleMatrix overrides) {
        Editing editing = editing(projectId);
        return overrides.keeping(editing.roles(), editing.runs());
    }

    /** Which parts of the matrix the project's owner may edit, decided by the owner's plan, never by the caller's. */
    private Editing editing(UUID projectId) {
        return projects.findById(projectId).map(project -> ownerEditing(project.ownerAccountId())).orElse(Editing.NONE);
    }

    private Editing ownerEditing(UUID ownerAccountId) {
        Set<String> ids = entitlements.of(ownerAccountId);
        return new Editing(ids.contains(Entitlements.ROLE_MATRIX_EDIT), ids.contains(Entitlements.RUN_CONFIG_EDIT));
    }

    /** What an account may edit: the roles (categories, signals and mods) and the run cells, each on its own id. */
    record Editing(boolean roles, boolean runs) {

        static final Editing NONE = new Editing(false, false);

        /** Both ids: the whole matrix and the profile layer are editable, as the plans grant them together. */
        boolean full() {
            return roles && runs;
        }
    }

    public RoleMatrixView get(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return view(projectId);
    }

    /** Replaces the project's whole override; an empty one goes back to the defaults. */
    public RoleMatrixView set(UUID accountId, UUID projectId, RoleMatrix overrides, int expectedVersion,
            Actor actor) {
        return set(accountId, projectId, overrides, true, expectedVersion, actor);
    }

    /**
     * The same, except that a write naming no runs ({@code runsNamed} false) keeps the project's run cells
     * (JAVA-915): a client written before they existed sends roles only, and must not wipe them.
     */
    public RoleMatrixView set(UUID accountId, UUID projectId, RoleMatrix overrides, boolean runsNamed,
            int expectedVersion, Actor actor) {
        return set(accountId, projectId, overrides, runsNamed, true, expectedVersion, actor);
    }

    /** The same, except that a write naming no mods ({@code modsNamed} false) keeps the project's (JAVA-1569). */
    public RoleMatrixView set(UUID accountId, UUID projectId, RoleMatrix overrides, boolean runsNamed,
            boolean modsNamed, int expectedVersion, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        RoleMatrixView current = view(projectId);
        if (current.version() != expectedVersion) {
            throw new RoleMatrixVersionConflictException(current);
        }
        Optional<RoleMatrixRepository.Stored> stored = matrices.find(projectId);
        RoleMatrix withRuns = runsNamed
                ? overrides
                : overrides.withRuns(stored.map(s -> s.overrides().runs()).orElse(RunMatrix.empty()));
        RoleMatrix written = modsNamed
                ? withRuns
                : withRuns.withMods(stored.map(s -> s.overrides().mods()).orElse(ModMatrix.empty()));
        requireEditable(projectId, written,
                stored.map(RoleMatrixRepository.Stored::overrides).orElse(RoleMatrix.empty()));
        Instant now = Instant.now(clock);
        if (!matrices.saveIfVersion(projectId, written, expectedVersion, now)) {
            throw new RoleMatrixVersionConflictException(view(projectId));
        }
        activity.record(projectId, null, null, actor, "project.roleMatrix", "Role matrix changed", now);
        activity.publish("project.roleMatrix", projectId, null, null, expectedVersion + 1, actor, now);
        return view(projectId);
    }

    /** Refuses a write that changes a part the owner's plan does not cover; a re-save of the same cells changes nothing. */
    private void requireEditable(UUID projectId, RoleMatrix written, RoleMatrix stored) {
        Editing editing = editing(projectId);
        boolean roles = !written.categories().equals(stored.categories())
                || !written.signals().equals(stored.signals())
                || !written.mods().equals(stored.mods());
        boolean runs = !written.runs().equals(stored.runs());
        if ((roles && !editing.roles()) || (runs && !editing.runs())) {
            throw Entitlements.planRequired();
        }
    }

    private RoleMatrixView view(UUID projectId) {
        Optional<WorkProfile> profile = activeProfile(projectId);
        RoleMatrix base = profile.map(WorkProfile::matrix).orElse(RoleMatrix.defaults());
        String profileId = profile.map(WorkProfile::id).orElse(null);
        Editing editing = editing(projectId);
        Optional<RoleMatrixRepository.Stored> stored = matrices.find(projectId);
        RoleMatrix overrides = stored.map(RoleMatrixRepository.Stored::overrides).orElse(RoleMatrix.empty());
        RoleMatrix kept = overrides.keeping(editing.roles(), editing.runs());
        Map<String, Object> effective = withMode(projectId, base.overlay(kept)).toWire();
        return new RoleMatrixView(projectId, effective, overrides.toWire(),
                stored.map(RoleMatrixRepository.Stored::version).orElse(0),
                stored.map(RoleMatrixRepository.Stored::updatedAt).orElse(null), profileId, base.toWire(),
                unknownRoles(effective), editing.full(), !kept.equals(overrides));
    }

    /** The role ids the effective matrix's category and signal rows name that the catalog lacks (JAVA-404). */
    private List<String> unknownRoles(Map<String, Object> effective) {
        Set<String> named = new TreeSet<>();
        for (String section : List.of("categories", "signals")) {
            if (effective.get(section) instanceof Map<?, ?> rows) {
                rows.values().forEach(row -> ((Map<?, ?>) row).values()
                        .forEach(roles -> ((List<?>) roles).forEach(id -> named.add(String.valueOf(id)))));
            }
        }
        return named.stream().filter(id -> catalog.find(id).isEmpty()).toList();
    }

    /**
     * {@code effective} is what the project's cards are read against; {@code overrides} is only what
     * the project changed, and what a write sends back. Version 0: the project never changed it.
     * {@code base} is the matrix under the project's own cells (JAVA-1627): the page needs it to say which
     * cells the project owns and what each one replaces, and a member cannot read the profile it names.
     * {@code unknownRoles} are the ids the effective matrix names that the catalog does not serve (JAVA-404).
     * {@code editable}: the project's owner holds both paid ids, so the owner may change the matrix (JAVA-1007).
     * {@code overridesInactive}: the stored overrides hold a part the owner's plan does not cover; they are kept and
     * come back on re-subscribing.
     */
    public record RoleMatrixView(UUID projectId, Map<String, Object> effective, Map<String, Object> overrides,
            int version, Instant updatedAt, String activeProfileId, Map<String, Object> base,
            List<String> unknownRoles, boolean editable, boolean overridesInactive) {
    }

    /** {@code 409 {error:"version_conflict", message, current:<RoleMatrixView>}} (contract §1.3). */
    public static class RoleMatrixVersionConflictException extends OfficiumException implements VersionConflict {

        private final RoleMatrixView current;

        RoleMatrixVersionConflictException(RoleMatrixView current) {
            super("version_conflict", "The project's role matrix changed since you last read it", 409);
            this.current = current;
        }

        @Override
        public RoleMatrixView current() {
            return current;
        }
    }
}
