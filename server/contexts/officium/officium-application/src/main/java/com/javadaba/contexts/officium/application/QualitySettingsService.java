package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PriorFailureSettings;
import com.javadaba.contexts.officium.domain.ProfileRecommendationSettings;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.QualitySettingsRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

/**
 * The owner's settings for the quality reads (card://JAVA-1803, card://JAVA-1804). Owner only, because a window, a budget
 * or a bar changes what every agent is shown. A feature the body does not name is left alone; a named one is replaced,
 * and named with nothing set it is reset to its defaults.
 */
@ApplicationScoped
public class QualitySettingsService {

    /** The prior-failure fields a body sets; {@code null} for the whole feature means it is not named. */
    public record PriorFailureUpdate(Integer windowDays, Integer maxCards, Integer maxFindings,
            Integer recurrenceThreshold) {
    }

    /** The profile-recommendation field a body sets; {@code raiseAt} null on a named feature resets it. */
    public record ProfileUpdate(Double raiseAt) {
    }

    /** What now applies to the project, each feature at its stored value or its default. */
    public record Effective(PriorFailureSettings priorFailures, ProfileRecommendationSettings profileRecommendations) {
    }

    private final QualitySettingsRepository settings;
    private final ProjectAccessGuard guard;
    private final Clock clock;

    @Inject
    public QualitySettingsService(QualitySettingsRepository settings, ProjectAccessGuard guard) {
        this(settings, guard, Clock.systemUTC());
    }

    QualitySettingsService(QualitySettingsRepository settings, ProjectAccessGuard guard, Clock clock) {
        this.settings = settings;
        this.guard = guard;
        this.clock = clock;
    }

    /** Applies the features the body names ({@code null} leaves one alone) and answers what now applies. */
    public Effective set(UUID accountId, UUID projectId, PriorFailureUpdate priorFailures, ProfileUpdate profile,
            Actor actor) {
        if (guard.requireAtLeast(projectId, accountId, Role.VIEWER).role() != Role.OWNER) {
            throw OfficiumException.forbidden("owner_only", "Only the project's owner sets its quality settings");
        }
        Instant now = clock.instant();
        if (priorFailures != null) {
            setPriorFailures(projectId, priorFailures, actor, now);
        }
        if (profile != null) {
            setProfile(projectId, profile, actor, now);
        }
        return effective(projectId);
    }

    /** What applies to the project now: its stored settings, each feature at its default when it stores none. */
    public Effective effective(UUID projectId) {
        return new Effective(settings.priorFailures(projectId).orElse(PriorFailureSettings.DEFAULTS),
                settings.profileRecommendations(projectId).orElse(ProfileRecommendationSettings.DEFAULTS));
    }

    private void setPriorFailures(UUID projectId, PriorFailureUpdate update, Actor actor, Instant now) {
        if (update.windowDays() == null && update.maxCards() == null && update.maxFindings() == null
                && update.recurrenceThreshold() == null) {
            settings.resetPriorFailures(projectId, actor, now);
            return;
        }
        settings.savePriorFailures(projectId, PriorFailureSettings.of(update.windowDays(), update.maxCards(),
                update.maxFindings(), update.recurrenceThreshold()), actor, now);
    }

    private void setProfile(UUID projectId, ProfileUpdate update, Actor actor, Instant now) {
        if (update.raiseAt() == null) {
            settings.resetProfileRecommendations(projectId, actor, now);
            return;
        }
        settings.saveProfileRecommendations(projectId, new ProfileRecommendationSettings(update.raiseAt()), actor, now);
    }
}
