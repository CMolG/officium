package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DocHistoryPolicyTest {

    private static final Instant NOW = Instant.parse("2026-10-13T12:00:00Z");
    private static final UUID PAGE = UUID.randomUUID();

    private static DocRevision rev(int version, long weight, int daysAgo, boolean heaviest) {
        Instant at = NOW.minusSeconds(daysAgo * 86400L);
        return new DocRevision(UUID.randomUUID(), null, PAGE, version, "t", "b", weight, null, at, at, heaviest);
    }

    private static List<Integer> versions(List<DocRevision> revisions) {
        return revisions.stream().map(DocRevision::version).toList();
    }

    private static List<Integer> flagged(DocPolicyResult result) {
        return result.kept().stream().filter(DocRevision::heaviest).map(DocRevision::version).toList();
    }

    private interface DocPolicyResult {
        List<DocRevision> kept();
    }

    private static DocPolicyResult apply(List<DocRevision> kept, DocRevision retiring, long current, int days) {
        var outcome = DocHistoryPolicy.apply(kept, retiring, current, days, NOW);
        return outcome::kept;
    }

    @Test
    void firstRetirementIsKeptAndFlaggedWhenHeavierThanCurrent() {
        var outcome = DocHistoryPolicy.apply(List.of(), rev(1, 100, 0, false), 50, 15, NOW);
        assertEquals(List.of(1), versions(outcome.kept()));
        assertTrue(outcome.kept().getFirst().heaviest());
    }

    @Test
    void currentVersionBeingTheHeaviestLeavesNothingFlagged() {
        var outcome = DocHistoryPolicy.apply(List.of(), rev(1, 100, 0, false), 200, 15, NOW);
        assertEquals(List.of(1), versions(outcome.kept()));
        assertTrue(flagged(apply(List.of(), rev(1, 100, 0, false), 200, 15)).isEmpty());
    }

    @Test
    void aHeavierOldVersionSurvivesBeyondTheTwoLatest() {
        var outcome = DocHistoryPolicy.apply(
                List.of(rev(1, 900, 40, true), rev(2, 100, 1, false), rev(3, 100, 1, false)),
                rev(4, 100, 0, false), 100, 15, NOW);
        assertEquals(List.of(4, 3, 1), versions(outcome.kept()));
        assertEquals(List.of(2), versions(outcome.dropped()));
    }

    @Test
    void tiesGoToTheLowerVersion() {
        var result = apply(List.of(rev(1, 100, 1, false), rev(2, 100, 1, false)), rev(3, 100, 0, false), 10, 15);
        assertEquals(List.of(1), flagged(result));
    }

    @Test
    void aTieWithTheCurrentVersionKeepsTheOlderOneFlagged() {
        assertEquals(List.of(1), flagged(apply(List.of(), rev(1, 100, 0, false), 100, 15)));
    }

    @Test
    void aHeavierNewcomerMovesTheFlagAndTheOldHeaviestBecomesOrdinary() {
        var outcome = DocHistoryPolicy.apply(List.of(rev(1, 500, 30, true), rev(2, 10, 1, false)),
                rev(3, 800, 0, false), 20, 15, NOW);
        assertEquals(List.of(3, 2), versions(outcome.kept()));
        assertEquals(List.of(1), versions(outcome.dropped()));
        assertTrue(outcome.kept().getFirst().heaviest());
    }

    @Test
    void recentRevisionsPastTheWindowExpireButTheHeaviestNeverDoes() {
        var outcome = DocHistoryPolicy.apply(List.of(rev(1, 900, 40, true), rev(2, 10, 20, false)),
                rev(3, 10, 0, false), 10, 15, NOW);
        assertEquals(List.of(3, 1), versions(outcome.kept()));
        assertEquals(List.of(2), versions(outcome.dropped()));
    }

    @Test
    void aRowThatIsBothRecentAndHeaviestNeverExpires() {
        var outcome = DocHistoryPolicy.apply(List.of(rev(1, 900, 400, true)), rev(2, 10, 0, false), 10, 15, NOW);
        assertEquals(List.of(2, 1), versions(outcome.kept()));
    }

    @Test
    void windowZeroKeepsOnlyTheHeaviest() {
        var outcome = DocHistoryPolicy.apply(List.of(rev(1, 900, 0, true), rev(2, 10, 0, false)),
                rev(3, 10, 0, false), 10, 0, NOW);
        assertEquals(List.of(1), versions(outcome.kept()));
        assertEquals(2, outcome.dropped().size());
    }

    @Test
    void deletingTheHeaviestMovesTheFlagToTheNextHeaviest() {
        var result = apply(List.of(rev(2, 300, 1, false), rev(3, 200, 1, false)), rev(4, 100, 0, false), 50, 15);
        assertEquals(List.of(2), flagged(result));
        assertEquals(List.of(4, 3, 2), versions(result.kept()));
    }

    @Test
    void settingsRefuseADaysOutsideTheRange() {
        var settings = DocSettings.defaults(UUID.randomUUID());
        assertThrows(OfficiumException.class, () -> settings.withHistoryDays(3651, null, NOW));
        assertEquals(0, settings.withHistoryDays(0, null, NOW).historyDays());
    }
}
