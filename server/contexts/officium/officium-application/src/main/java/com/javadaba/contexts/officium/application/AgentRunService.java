package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.ActorKind;
import com.javadaba.contexts.officium.domain.AgentRun;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.TimeSource;
import com.javadaba.contexts.officium.domain.ports.AgentRunRepository;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * JAVA-50 (user report, 2026-09-24: agents imputed no time at all). The only writer of time was
 * {@code cards.logTime}, and no agent called it. Now the agent's own signals -- the ones that
 * already light the card up on the board (§4.1) -- also persist a run, and a run that ends becomes
 * time entries (contract §8.4). Nothing here depends on an agent remembering anything.
 *
 * <p>Imputing never bumps the card's version: the agent's next write must not conflict because of
 * bookkeeping it didn't do.
 */
@ApplicationScoped
public class AgentRunService {

    private static final DateTimeFormatter CLOCK_TIME = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT)
            .withZone(ZoneOffset.UTC);

    private final AgentRunRepository runs;
    private final CardTimeEntryRepository entries;
    private final CardRepository cards;
    private final ActivityPublisher activity;
    private final ImputedTime imputedTime;
    private final Clock clock;

    @Inject
    public AgentRunService(AgentRunRepository runs, CardTimeEntryRepository entries, CardRepository cards,
            ActivityPublisher activity, ImputedTime imputedTime) {
        this(runs, entries, cards, activity, imputedTime, Clock.systemUTC());
    }

    AgentRunService(AgentRunRepository runs, CardTimeEntryRepository entries, CardRepository cards,
            ActivityPublisher activity, ImputedTime imputedTime, Clock clock) {
        this.runs = runs;
        this.entries = entries;
        this.cards = cards;
        this.activity = activity;
        this.imputedTime = imputedTime;
        this.clock = clock;
    }

    /** The agent started (or keeps) working the card. A run that had lapsed is closed at its last
     *  sign of life first, and a new one starts: the gap between them was nobody's work. */
    public void started(UUID projectId, UUID cardId, Actor actor) {
        if (actor.kind() != ActorKind.AGENT) {
            return;
        }
        Instant now = Instant.now(clock);
        var open = runs.findOpen(cardId);
        if (open.isPresent()) {
            AgentRun run = open.get();
            if (!run.lapsedAt(now)) {
                runs.touch(run.id(), now, actor.machine());
                return;
            }
            end(run, run.lastSeenAt());
        }
        runs.insert(AgentRun.start(projectId, cardId, actor, now));
    }

    /** A sign of life on the card: renews a live run, and closes one that already lapsed. Never starts one. */
    public void seen(UUID cardId, Actor actor) {
        if (actor.kind() != ActorKind.AGENT) {
            return;
        }
        Instant now = Instant.now(clock);
        runs.findOpen(cardId).ifPresent(run -> {
            if (run.lapsedAt(now)) {
                end(run, run.lastSeenAt());
            } else {
                runs.touch(run.id(), now, actor.machine());
            }
        });
    }

    /** The agent put the card down: the run ends now, or at its last sign of life if it had lapsed. */
    public void stopped(UUID cardId, Actor actor) {
        if (actor.kind() != ActorKind.AGENT) {
            return;
        }
        Instant now = Instant.now(clock);
        runs.findOpen(cardId).ifPresent(run -> end(run, run.endFor(now)));
    }

    /** Each card's most recent run, open or ended (JAVA-200). */
    public List<AgentRun> latestOf(Collection<UUID> cardIds) {
        return runs.latestOf(cardIds);
    }

    /** JAVA-515: the runs still alive -- open and seen within {@link AgentRun#LAPSE} -- each with its card's key,
     *  which is what the board rebuilds its sessions from after a restart. A deleted card's run is left out. */
    public List<LiveRun> live() {
        List<LiveRun> result = new ArrayList<>();
        for (AgentRun run : runs.openSeenAfter(Instant.now(clock).minus(AgentRun.LAPSE))) {
            cards.findById(run.projectId(), run.cardId()).filter(card -> !card.deleted())
                    .ifPresent(card -> result.add(new LiveRun(run, card.key())));
        }
        return result;
    }

    public record LiveRun(AgentRun run, String cardKey) {
    }

    /** Closes every run nobody ended, at its last sign of life. @return how many it closed. */
    public int sweep() {
        List<AgentRun> lapsed = runs.openSeenBefore(Instant.now(clock).minus(AgentRun.LAPSE));
        for (AgentRun run : lapsed) {
            end(run, run.lastSeenAt());
        }
        return lapsed.size();
    }

    /** Imputes the run, as refinement while the card sat in refine and as work otherwise. A session its
     *  harness reported (JAVA-245) is authoritative for the span it covered, so the run imputes only
     *  what came after the last report on this card. */
    private void end(AgentRun run, Instant endedAt) {
        if (!runs.close(run.id(), endedAt)) {
            return;
        }
        String who = run.agent().name();
        Instant start = entries.latestSessionEnd(run.cardId(), who).filter(run.startedAt()::isBefore)
                .orElse(run.startedAt());
        Card card = cards.findById(run.projectId(), run.cardId()).orElse(null);
        if (card == null || !AgentRun.worthImputing(start, endedAt)) {
            return;
        }
        Instant now = Instant.now(clock);
        String note = "Imputed from " + who + "'s run, " + CLOCK_TIME.format(start) + "-" + CLOCK_TIME.format(endedAt)
                + " UTC";
        List<CardTimeEntry> imputed = ImputedTime.entries(new ImputedTime.Span(run.cardId(), start, endedAt, who,
                note, TimeSource.AGENT_RUN, null, null, null, null, null, null), imputedTime.refineOf(card), now);
        imputed.forEach(entries::insert);
        double total = imputed.stream().mapToDouble(CardTimeEntry::hours).sum();
        if (total <= 0) {
            return;
        }
        activity.record(run.projectId(), run.cardId(), card.key(), run.agent(), "card.time",
                String.format(Locale.ROOT, "%.2fh imputed from %s's run", total, who), now);
        activity.publish("card.time", run.projectId(), run.cardId(), card.key(), null, run.agent(), now);
    }
}
