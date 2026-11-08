package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.ProfileTally;
import com.javadaba.contexts.officium.domain.ReviewOutcome;
import com.javadaba.contexts.officium.domain.ReviewReturn;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * What {@link ProfileTally} reads for one period (card://JAVA-1527), bounded by it: the review exits inside the
 * period, then the whole review history and the phase runs of only the cards the period touched (an exit, a
 * send-back, an escaped defect or time), so a project's history is never read whole on every metrics call. The
 * escaped defects are read whole: one row per corrective card, and a later one still takes a delivery's "clean".
 */
final class ProfileInputs {

    private ProfileInputs() {
    }

    static ProfileTally.Input of(QualityLedger quality, UUID projectId, Map<UUID, Card> byId,
            List<ReviewReturn> returns, List<CardTimeEntry> time, Instant start, Instant end, Set<UUID> tokenCards) {
        List<ReviewOutcome> inPeriod = quality.reviewOutcomes().listByProjectBetween(projectId, start, end);
        var defects = quality.escapedDefects().listByProject(projectId);
        Set<UUID> reviewed = new HashSet<>();
        inPeriod.forEach(outcome -> reviewed.add(outcome.cardId()));
        Set<UUID> touched = new HashSet<>(reviewed);
        returns.stream().filter(r -> !r.at().isBefore(start) && r.at().isBefore(end))
                .forEach(r -> touched.add(r.cardId()));
        defects.stream().filter(d -> !d.at().isBefore(start) && d.at().isBefore(end))
                .forEach(d -> touched.add(d.originCardId()));
        time.forEach(entry -> touched.add(entry.cardId()));
        List<ReviewOutcome> outcomes = quality.reviewOutcomes().listByCards(reviewed).values().stream()
                .flatMap(List::stream).toList();
        return new ProfileTally.Input(byId, quality.phaseRuns().listByCards(touched), outcomes, returns, defects, time,
                start, end, tokenCards);
    }
}
