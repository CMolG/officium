package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Entitlements;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.VersionConflict;
import com.javadaba.contexts.officium.domain.WorkProfile;
import com.javadaba.contexts.officium.domain.WorkProfiles;
import com.javadaba.contexts.officium.domain.ports.AccountEntitlements;
import com.javadaba.contexts.officium.domain.ports.RoleCatalog;
import com.javadaba.contexts.officium.domain.ports.WorkProfileRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Work profiles (card://JAVA-1524): each account's named distributions of roles, models and efforts over the role
 * matrix, the built-ins Claude Standard and Claude Eco included, and the one a project's owner activates. What a
 * project's cards are read against is {@link RoleMatrixService#effective}; this service owns the profiles and the
 * activation, and {@code roles.get}, {@code mods.list} and {@code mods.get}, their content from Fluxor's catalog (ADR 0018).
 */
@ApplicationScoped
public class WorkProfileService {

    /** The most profiles an account keeps, built-in copies included. */
    static final int MAX_PROFILES = 20;

    private final WorkProfileRepository profiles;
    private final ProjectAccessGuard guard;
    private final ActivityPublisher activity;
    private final RoleCatalog roles;
    private final AccountEntitlements entitlements;
    private final Clock clock;

    @Inject
    public WorkProfileService(WorkProfileRepository profiles, ProjectAccessGuard guard, ActivityPublisher activity,
            RoleCatalog roles, AccountEntitlements entitlements) {
        this(profiles, guard, activity, roles, entitlements, Clock.systemUTC());
    }

    WorkProfileService(WorkProfileRepository profiles, ProjectAccessGuard guard, ActivityPublisher activity,
            RoleCatalog roles, AccountEntitlements entitlements, Clock clock) {
        this.profiles = profiles;
        this.guard = guard;
        this.activity = activity;
        this.roles = roles;
        this.entitlements = entitlements;
        this.clock = clock;
    }

    /** One profile in a list. {@code customized}: a built-in this account edited. */
    public record ProfileSummary(String id, String name, boolean builtin, boolean customized, int version,
            Instant updatedAt, boolean active) {
    }

    /**
     * The caller's profiles, and the one {@code projectId} has active (whoever's it is), when one is given.
     * {@code editable}: the caller's plan lets them customize a profile (JAVA-1007).
     */
    public record ProfilesView(UUID projectId, List<ProfileSummary> profiles, ActiveView active, boolean editable) {
    }

    /** A project's active profile: its id, its name, and whether it is the caller's own (no account id is served). */
    public record ActiveView(String profileId, String name, boolean yours, Instant activatedAt, boolean shuffle) {
    }

    /** {@code overrides} is what the profile changes; {@code matrix} the full matrix it gives a project. */
    public record ProfileView(String id, String name, boolean builtin, boolean customized, int version,
            Instant updatedAt, Map<String, Object> overrides, Map<String, Object> matrix) {
    }

    /** {@code roles.get}: a role's sheet from Fluxor's catalog; {@code source} is {@code harness} when the project pins it. */
    public record RoleView(String roleId, int version, String title, String description, String body, String source) {
    }

    /** One role in {@code roles.list}: no body, so the catalog stays a small read. */
    public record RoleSummary(String roleId, int version, String title, String description, List<String> tags) {
    }

    /** {@code roles.list}: the roles of Fluxor's catalog, by id. */
    public record RolesView(List<RoleSummary> roles) {
    }

    /** One mod in {@code mods.list}: no body, so the whole catalog stays a small read. */
    public record ModSummary(String modId, int version, String title, String description, List<String> tags,
            List<String> domains, List<String> incompatibleWith, List<String> requiredBy) {
    }

    /** {@code mods.list}: the mods of Fluxor's catalog, by id. */
    public record ModsView(List<ModSummary> mods) {
    }

    /** {@code mods.get}: a mod's sheet from Fluxor's catalog, its {@code body} in Markdown. */
    public record ModView(String modId, int version, String title, String description, String body,
            List<String> tags, List<String> domains, List<String> incompatibleWith, List<String> requiredBy) {
    }

    /**
     * A profile write: {@code overrides} names the cells it changes (null: none); {@code reset} drops a built-in's
     * copy, back to the shipped profile.
     */
    public record Upsert(String name, RoleMatrix overrides, int expectedVersion, boolean reset) {
    }

    public ProfilesView list(UUID accountId, UUID projectId) {
        Optional<WorkProfileRepository.Active> active = Optional.empty();
        if (projectId != null) {
            guard.requireAccess(projectId, accountId);
            active = profiles.active(projectId);
        }
        Optional<WorkProfileRepository.Active> current = active;
        List<ProfileSummary> summaries = new ArrayList<>();
        for (WorkProfile profile : merged(accountId).values()) {
            boolean isActive = current.filter(a -> a.accountId().equals(accountId)
                    && a.profileId().equals(profile.id())).isPresent();
            summaries.add(new ProfileSummary(profile.id(), profile.name(), profile.builtin(),
                    profile.builtin() && profile.version() > 0, profile.version(), profile.updatedAt(), isActive));
        }
        return new ProfilesView(projectId, summaries, active.map(a -> activeView(a, accountId)).orElse(null),
                editsProfiles(accountId));
    }

    public ProfileView get(UUID accountId, String profileId) {
        return view(find(accountId, WorkProfile.requireId(profileId)).orElseThrow(() -> notFound(profileId)));
    }

    public ProfileView upsert(UUID accountId, String profileId, Upsert request) {
        WorkProfile.requireId(profileId);
        Optional<WorkProfile> current = find(accountId, profileId);
        int version = current.map(WorkProfile::version).orElse(0);
        if (request.expectedVersion() != version) {
            throw new ProfileVersionConflictException(current.map(this::view).orElse(null));
        }
        if (request.reset()) {
            if (!WorkProfiles.isBuiltin(profileId)) {
                throw OfficiumException.badRequest("profile_not_builtin",
                        "Only a built-in profile is reset; a profile of yours is changed or replaced");
            }
            profiles.delete(accountId, profileId);
            return get(accountId, profileId);
        }
        if (current.isEmpty() && profiles.listByAccount(accountId).size() >= MAX_PROFILES) {
            throw OfficiumException.conflict("too_many_profiles", "An account keeps at most " + MAX_PROFILES
                    + " profiles: change one of yours instead");
        }
        String name = WorkProfile.requireName(request.name() != null
                ? request.name()
                : current.map(WorkProfile::name).orElse(null));
        RoleMatrix base = current.map(WorkProfile::overrides).orElse(RoleMatrix.empty());
        // The cells a write names replace the profile's; the rest are kept, so a partial edit never wipes a built-in.
        RoleMatrix overrides = request.overrides() == null ? base : base.overlay(request.overrides());
        // Customizing a profile is editing the matrix: a plan that does not cover it refuses a change, and a re-save is free.
        if (!overrides.equals(base) && !editsProfiles(accountId)) {
            throw Entitlements.planRequired();
        }
        // A built-in nobody edited has no row yet: its first edit inserts the copy, at version 1.
        int stored = profiles.find(accountId, profileId).map(WorkProfile::version).orElse(0);
        if (!profiles.saveIfVersion(accountId, profileId, name, overrides, stored, Instant.now(clock))) {
            throw new ProfileVersionConflictException(find(accountId, profileId).map(this::view).orElse(null));
        }
        return get(accountId, profileId);
    }

    /**
     * Owner only, like the project's own matrix: a null {@code profileId} goes back to Officium's defaults. {@code
     * shuffle} turns shuffle mode on or off on the profile (card://JAVA-1858); null keeps it as it was.
     */
    public ProfilesView activate(UUID accountId, UUID projectId, String profileId, Boolean shuffle, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.OWNER);
        String name = profileId == null
                ? null
                : find(accountId, WorkProfile.requireId(profileId)).orElseThrow(() -> notFound(profileId)).name();
        Instant now = Instant.now(clock);
        profiles.activate(projectId, accountId, profileId, now, shuffle);
        activity.record(projectId, null, null, actor, "project.workProfile", profileId == null
                ? "Work profile cleared: Officium's defaults"
                : "Work profile set to " + name + (shuffle == null ? "" : shuffle ? ", shuffle on" : ", shuffle off"),
                now);
        activity.publish("project.roleMatrix", projectId, null, null, null, actor, now);
        return list(accountId, projectId);
    }

    /** The role as the project reads it: the version its harness pins, else the newest, or {@code version} exactly. */
    public RoleView role(UUID accountId, UUID projectId, String roleId, Integer version) {
        guard.requireAccess(projectId, accountId);
        return roles.resolve(projectId, roleId == null ? "" : roleId.strip(), version)
                .map(read -> new RoleView(read.role().roleId(), read.role().version(), read.role().title(),
                        read.role().description(), read.role().body(), read.source()))
                .orElseThrow(() -> OfficiumException.notFound("unknown_role", "Fluxor's catalog has no role "
                        + roleId + (version == null ? "" : " at version " + version)
                        + ": work the card under its category's contract"));
    }

    public RolesView roles(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return new RolesView(roles.roles().stream().map(role -> new RoleSummary(role.roleId(), role.version(),
                role.title(), role.description(), role.tags())).toList());
    }

    public ModsView mods(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return new ModsView(roles.mods().stream().map(mod -> new ModSummary(mod.modId(), mod.version(), mod.title(),
                mod.description(), mod.tags(), mod.domains(), mod.incompatibleWith(), mod.requiredBy())).toList());
    }

    public ModView mod(UUID accountId, UUID projectId, String modId) {
        guard.requireAccess(projectId, accountId);
        return roles.findMod(modId == null ? "" : modId.strip())
                .map(mod -> new ModView(mod.modId(), mod.version(), mod.title(), mod.description(), mod.body(),
                        mod.tags(), mod.domains(), mod.incompatibleWith(), mod.requiredBy()))
                .orElseThrow(() -> OfficiumException.notFound("unknown_mod", "Fluxor's catalog has no mod " + modId
                        + ": skip it, or ask for mods.list"));
    }

    /** Whether the account's plan covers both paid ids: a profile names roles, models and efforts (JAVA-1007). */
    private boolean editsProfiles(UUID accountId) {
        return entitlements.of(accountId)
                .containsAll(List.of(Entitlements.ROLE_MATRIX_EDIT, Entitlements.RUN_CONFIG_EDIT));
    }

    /** The account's profiles by id: the built-ins first (or the account's copies), then its own. */
    private Map<String, WorkProfile> merged(UUID accountId) {
        Map<String, WorkProfile> byId = new LinkedHashMap<>();
        WorkProfiles.builtins().forEach(profile -> byId.put(profile.id(), profile));
        profiles.listByAccount(accountId).forEach(profile -> byId.put(profile.id(), profile));
        return byId;
    }

    private Optional<WorkProfile> find(UUID accountId, String profileId) {
        return profiles.find(accountId, profileId).or(() -> WorkProfiles.builtin(profileId));
    }

    private ActiveView activeView(WorkProfileRepository.Active active, UUID caller) {
        String name = find(active.accountId(), active.profileId()).map(WorkProfile::name).orElse(active.profileId());
        return new ActiveView(active.profileId(), name, active.accountId().equals(caller), active.activatedAt(),
                active.shuffle());
    }

    private ProfileView view(WorkProfile profile) {
        return new ProfileView(profile.id(), profile.name(), profile.builtin(),
                profile.builtin() && profile.version() > 0, profile.version(), profile.updatedAt(),
                profile.overrides().toWire(), profile.matrix().toWire());
    }

    private static OfficiumException notFound(String profileId) {
        return OfficiumException.notFound("profile_not_found", "You have no work profile " + profileId);
    }

    /** {@code 409 {error:"version_conflict", message, current:<ProfileView>}}; current is null for a gone one. */
    public static class ProfileVersionConflictException extends OfficiumException implements VersionConflict {

        private final ProfileView current;

        ProfileVersionConflictException(ProfileView current) {
            super("version_conflict", "The work profile changed since you last read it", 409);
            this.current = current;
        }

        @Override
        public ProfileView current() {
            return current;
        }
    }
}
