package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.AgentRun;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.SessionOverhead;
import com.javadaba.contexts.officium.domain.TimeConcept;
import com.javadaba.contexts.officium.domain.TimeSource;
import com.javadaba.contexts.officium.domain.TimeSplit;
import com.javadaba.contexts.officium.domain.TokenUsage;
import com.javadaba.contexts.officium.domain.WorkProfile;
import com.javadaba.contexts.officium.domain.ports.AgentRunRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository;
import com.javadaba.contexts.officium.domain.ports.SessionOverheadRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * JAVA-245 (contract §8.4): the whole session an agent spent on its cards, reported by its harness.
 * A run (JAVA-50) only knows when the agent wrote to a card, loses every gap over ten minutes, and
 * knows nothing of tokens -- so an agent's time came out underestimated. The harness reads its own
 * transcript instead and reports tracks: a span of the session on one card, with one model and the
 * tokens it spent, the main agent's and each subagent's.
 *
 * <p>The report is authoritative for its span: it replaces what an earlier report of the same session
 * imputed, and the run-imputed entries of the same agent it overlaps. It signs with the account's
 * heartbeat token (§4.2), so a secret never passes through an agent.
 */
@ApplicationScoped
public class SessionUsageService {

    static final int MAX_TRACKS = 500;
    private static final Pattern SESSION = Pattern.compile("[A-Za-z0-9_-]{1,100}");
    private static final DateTimeFormatter CLOCK_TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT)
            .withZone(ZoneOffset.UTC);

    private final HeartbeatService heartbeat;
    private final ProjectAccessGuard guard;
    private final CardService cardService;
    private final CardRepository cards;
    private final CardTimeEntryRepository entries;
    private final AgentRunRepository runs;
    private final ImputedTime imputedTime;
    private final ActivityPublisher activity;
    private final RoleMatrixService roleMatrices;
    private final SessionOverheadRepository overhead;
    private final Clock clock;

    @Inject
    public SessionUsageService(HeartbeatService heartbeat, ProjectAccessGuard guard, CardService cardService,
            CardRepository cards, CardTimeEntryRepository entries, AgentRunRepository runs, ImputedTime imputedTime,
            ActivityPublisher activity, RoleMatrixService roleMatrices, SessionOverheadRepository overhead) {
        this.heartbeat = heartbeat;
        this.guard = guard;
        this.cardService = cardService;
        this.cards = cards;
        this.entries = entries;
        this.runs = runs;
        this.imputedTime = imputedTime;
        this.activity = activity;
        this.roleMatrices = roleMatrices;
        this.overhead = overhead;
        this.clock = Clock.systemUTC();
    }

    /**
     * {@code attended} is the session's, not a track's: whether a person had a window open while it ran
     * (card://JAVA-1047). Null when the harness did not say.
     */
    public Result report(String token, String session, String machine, Boolean attended, List<Track> tracks) {
        UUID accountId = heartbeat.accountFor(token);
        if (session == null || !SESSION.matcher(session).matches()) {
            throw OfficiumException.badRequest("session_required", "Name the session: letters, digits, - and _");
        }
        if (tracks == null || tracks.isEmpty() || tracks.size() > MAX_TRACKS) {
            throw OfficiumException.badRequest("invalid_usage", "A report carries 1 to " + MAX_TRACKS + " tracks");
        }
        tracks.forEach(SessionUsageService::validate);

        Map<String, Card> byRef = new LinkedHashMap<>();
        for (Track track : tracks) {
            if (track.card() == null) {
                guard.requireAtLeast(track.projectId(), accountId, Role.EDITOR);
                continue;
            }
            byRef.computeIfAbsent(track.projectId() + "/" + track.card(), ref -> {
                guard.requireAtLeast(track.projectId(), accountId, Role.EDITOR);
                UUID cardId = cardService.resolveCardId(accountId, track.projectId(), track.card());
                return cards.findById(track.projectId(), cardId).orElseThrow();
            });
        }
        List<UUID> cardIds = byRef.values().stream().map(Card::id).distinct().toList();
        Actor agent = agentOf(accountId, cardIds, machine);
        String who = agent.name();
        // Scoped to the account: a session id is the client's, and must never reach another's entries.
        String sessionRef = accountId + ":" + session;
        Instant from = tracks.stream().map(Track::startedAt).min(Comparator.naturalOrder()).orElseThrow();
        Instant to = tracks.stream().map(Track::endedAt).max(Comparator.naturalOrder()).orElseThrow();

        entries.deleteBySession(sessionRef);
        overhead.deleteBySession(sessionRef);
        entries.deleteRunEntriesOverlapping(cardIds, who, from, to);
        Instant now = Instant.now(clock);
        Map<UUID, List<TimeSplit.Interval>> refine = new LinkedHashMap<>();
        // The profile each project runs under now: the session's snapshot for Contributions (card://JAVA-1527).
        Map<UUID, String> profiles = new LinkedHashMap<>();
        int written = 0;
        for (Track track : tracks) {
            if (track.card() == null) {
                overhead.insert(new SessionOverhead(UUID.randomUUID(), track.projectId(), accountId, sessionRef,
                        track.subagent(), track.model(), track.effort(), track.startedAt(), track.endedAt(),
                        track.tokens(), attended));
                written++;
                continue;
            }
            Card card = byRef.get(track.projectId() + "/" + track.card());
            String note = "Imputed from "
                    + (track.subagent() == null ? who + "'s session" : "subagent " + track.subagent())
                    + ", " + CLOCK_TIME.format(track.startedAt()) + "-" + CLOCK_TIME.format(track.endedAt()) + " UTC";
            List<CardTimeEntry> imputed = ImputedTime.entries(new ImputedTime.Span(card.id(), track.startedAt(),
                    track.endedAt(), who, note, TimeSource.AGENT_SESSION, track.model(), track.effort(), track.tokens(),
                    sessionRef,
                    track.subagent(), track.concept()),
                    refine.computeIfAbsent(card.id(), id -> imputedTime.refineOf(card)), now);
            String profile = profiles.computeIfAbsent(card.projectId(),
                    id -> roleMatrices.activeProfile(id).map(WorkProfile::id).orElse(""));
            imputed.forEach(entry -> entries.insert(entry.withAttended(attended)
                    .withProfile(profile.isEmpty() ? null : profile)));
            written += imputed.size();
        }
        List<String> keys = new ArrayList<>();
        for (Card card : byRef.values()) {
            if (!keys.contains(card.key())) {
                keys.add(card.key());
                // A refresh for whoever has the card open; no activity line, since a harness reports
                // at every turn and the log would drown in it.
                activity.publish("card.time", card.projectId(), card.id(), card.key(), null, agent, now);
            }
        }
        return new Result(keys, written);
    }

    /** The agent as its runs name it, so the report and the runs it supersedes share one {@code who}. */
    private Actor agentOf(UUID accountId, List<UUID> cardIds, String machine) {
        String where = machine == null || machine.isBlank() ? null : machine.strip();
        return runs.latestOf(cardIds).stream()
                .filter(run -> accountId.equals(run.agent().accountId()))
                .max(Comparator.comparing(AgentRun::lastSeenAt))
                .map(AgentRun::agent)
                .orElseGet(() -> Actor.agent(accountId, "Agent on " + (where == null ? "an unnamed machine" : where),
                        where));
    }

    private static void validate(Track track) {
        if (track.projectId() == null || (track.card() != null && track.card().isBlank())) {
            throw OfficiumException.badRequest("invalid_usage",
                    "Every track names its projectId, and its card if it has one");
        }
        if (track.startedAt() == null || track.endedAt() == null || track.endedAt().isBefore(track.startedAt())) {
            throw OfficiumException.badRequest("invalid_usage", "A track needs startedAt <= endedAt");
        }
        if (track.concept() != null && track.concept() != TimeConcept.TEST) {
            throw OfficiumException.badRequest("invalid_usage",
                    "concept is test or absent: refine and work are read from the card's moves");
        }
        if ((track.model() != null && track.model().length() > 100)
                || (track.effort() != null && track.effort().length() > 20)
                || (track.subagent() != null && track.subagent().length() > 200)) {
            throw OfficiumException.badRequest("invalid_usage",
                    "model is at most 100 characters, effort 20, subagent 200");
        }
    }

    /** A span of the session on one card with one model at one effort: the main agent's ({@code subagent}
     *  null) or a subagent's, named by its type and task. A track with no card is usage no card picked up
     *  (card://JAVA-1047): the project's overhead. */
    public record Track(UUID projectId, String card, String subagent, String model, String effort, Instant startedAt,
            Instant endedAt, TokenUsage tokens, TimeConcept concept) {
    }

    /** The cards the report imputed time to, and how many entries it wrote. */
    public record Result(List<String> cards, int entries) {
    }
}
