package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.RoleMatrix;
import com.javadaba.contexts.officium.domain.WorkProfile;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Work profiles (card://JAVA-1524): an account's own profiles and its copies of the built-ins, and which profile
 * each project has active. A built-in nobody edited has no row.
 */
public interface WorkProfileRepository {

    /** The account's stored profiles, by id. */
    List<WorkProfile> listByAccount(UUID accountId);

    Optional<WorkProfile> find(UUID accountId, String profileId);

    /**
     * Writes the profile if its stored version is {@code expectedVersion} (0: none stored), at that version plus
     * one; whether it was written.
     */
    boolean saveIfVersion(UUID accountId, String profileId, String name, RoleMatrix overrides, int expectedVersion,
            Instant at);

    /** Drops the account's stored copy; a built-in goes back to its default. */
    void delete(UUID accountId, String profileId);

    /** The project's active profile: whose account it is, its id, and whether shuffle mode is on (card://JAVA-1858). */
    record Active(UUID accountId, String profileId, Instant activatedAt, boolean shuffle) {
    }

    Optional<Active> active(UUID projectId);

    /**
     * Sets the project's active profile, or clears it with a null {@code profileId}. {@code shuffle} turns shuffle
     * mode on or off; null keeps what the project had (off for a project that had no active profile).
     */
    void activate(UUID projectId, UUID accountId, String profileId, Instant at, Boolean shuffle);
}
