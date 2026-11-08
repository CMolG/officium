package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardKeys;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PriorFailureSettings;
import com.javadaba.contexts.officium.domain.PriorFailures;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.PriorFailureRepository;
import com.javadaba.contexts.officium.domain.ports.QualitySettingsRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * What the cards around a planned card failed on (card://JAVA-1803): the send-backs and escaped defects of the window,
 * read for one card under the project's settings. Read-only; the caller says which paths its plan touches and which
 * cards touched them, because Officium holds no repository.
 */
@ApplicationScoped
public class PriorFailureService {

    /** The most rows of each kind one answer reads: a fixed cost however long the project's history grows. */
    static final int ROWS_CAP = 2000;

    static final int MAX_PATHS = 20;
    static final int MAX_PATH_CHARS = 300;
    static final int MAX_KEYS_PER_PATH = 30;

    private static final Pattern KEY = Pattern.compile("^[A-Za-z][A-Za-z0-9]*-\\d+$");

    /** A path the plan names, with the keys of the cards whose commits touched it. */
    public record Touched(String path, List<String> cards) {
    }

    /** The answer, with the settings it was read under and the window it covers. */
    public record Answer(String card, PriorFailureSettings settings, boolean customSettings, Instant from, Instant to,
            PriorFailures failures, boolean windowTruncated) {
    }

    private final CardRepository cards;
    private final ProjectAccessGuard guard;
    private final PriorFailureRepository rows;
    private final QualitySettingsRepository settings;
    private final Clock clock;

    @Inject
    public PriorFailureService(CardRepository cards, ProjectAccessGuard guard, PriorFailureRepository rows,
            QualitySettingsRepository settings) {
        this(cards, guard, rows, settings, Clock.systemUTC());
    }

    PriorFailureService(CardRepository cards, ProjectAccessGuard guard, PriorFailureRepository rows,
            QualitySettingsRepository settings, Clock clock) {
        this.cards = cards;
        this.guard = guard;
        this.rows = rows;
        this.settings = settings;
        this.clock = clock;
    }

    /** The failure history around the card {@code keyOrId}; refused with {@code invalid_touched} when a limit is passed. */
    public Answer answer(UUID accountId, UUID projectId, String keyOrId, List<Touched> touched) {
        guard.requireAtLeast(projectId, accountId, Role.VIEWER);
        Card planned = requireCard(projectId, keyOrId);
        Map<String, Set<String>> paths = paths(touched);
        Optional<PriorFailureSettings> stored = settings.priorFailures(projectId);
        PriorFailureSettings effective = stored.orElse(PriorFailureSettings.DEFAULTS);
        Instant to = clock.instant();
        Instant from = to.minus(Duration.ofDays(effective.windowDays()));
        PriorFailureRepository.Window window = rows.window(projectId, from, ROWS_CAP);
        return new Answer(planned.key(), effective, stored.isPresent(), from, to,
                PriorFailures.answer(planned, window.rows(), paths, effective), window.truncated());
    }

    private Card requireCard(UUID projectId, String keyOrId) {
        Optional<Card> found = CardKeys.looksLikeKey(keyOrId)
                ? cards.findByKey(projectId, keyOrId)
                : findById(projectId, keyOrId);
        return found.filter(card -> !card.deleted())
                .orElseThrow(() -> OfficiumException.notFound("card_not_found", "No such card"));
    }

    private Optional<Card> findById(UUID projectId, String keyOrId) {
        try {
            return cards.findById(projectId, UUID.fromString(keyOrId));
        } catch (IllegalArgumentException ex) {
            return cards.findByKey(projectId, keyOrId);
        }
    }

    /** The touched paths checked against the limits, the duplicate paths and keys merged. */
    static Map<String, Set<String>> paths(List<Touched> touched) {
        if (touched.size() > MAX_PATHS) {
            throw invalid("touched takes at most " + MAX_PATHS + " paths");
        }
        Map<String, Set<String>> paths = new LinkedHashMap<>();
        for (Touched entry : touched) {
            String path = entry.path() == null ? "" : entry.path();
            if (path.isBlank() || path.length() > MAX_PATH_CHARS) {
                throw invalid("a touched path is 1 to " + MAX_PATH_CHARS + " characters");
            }
            if (entry.cards().size() > MAX_KEYS_PER_PATH) {
                throw invalid("a touched path names at most " + MAX_KEYS_PER_PATH + " cards");
            }
            Set<String> keys = paths.computeIfAbsent(path, p -> new LinkedHashSet<>());
            for (String key : entry.cards()) {
                if (!KEY.matcher(key).matches()) {
                    throw invalid("not a card key: " + key);
                }
                keys.add(key.toUpperCase(Locale.ROOT));
            }
        }
        return paths;
    }

    private static OfficiumException invalid(String message) {
        return OfficiumException.badRequest("invalid_touched", message);
    }
}
