package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.PriorFailureSettings;
import com.javadaba.contexts.officium.domain.ProfileRecommendationSettings;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** The per-project quality settings (card://JAVA-1803): a project stores a feature's settings only when it sets them. */
public interface QualitySettingsRepository {

    /** The prior-failure settings the project stores, or empty when it stores none (the defaults apply). */
    Optional<PriorFailureSettings> priorFailures(UUID projectId);

    /** Replaces the project's prior-failure settings, recording who and when. */
    void savePriorFailures(UUID projectId, PriorFailureSettings settings, Actor by, Instant at);

    /** Drops the project's prior-failure settings, so the defaults apply again. */
    void resetPriorFailures(UUID projectId, Actor by, Instant at);

    /** The profile-recommendation bar the project stores, or empty when it stores none (the default applies). */
    Optional<ProfileRecommendationSettings> profileRecommendations(UUID projectId);

    /** Replaces the project's profile-recommendation bar, recording who and when. */
    void saveProfileRecommendations(UUID projectId, ProfileRecommendationSettings settings, Actor by, Instant at);

    /** Drops the project's profile-recommendation bar, so the default applies again. */
    void resetProfileRecommendations(UUID projectId, Actor by, Instant at);
}
