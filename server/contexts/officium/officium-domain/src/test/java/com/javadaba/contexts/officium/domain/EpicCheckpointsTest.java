package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static com.javadaba.contexts.officium.domain.EpicFixtures.blocks;
import static com.javadaba.contexts.officium.domain.EpicFixtures.child;
import static com.javadaba.contexts.officium.domain.EpicFixtures.epic;
import static com.javadaba.contexts.officium.domain.EpicFixtures.standalone;
import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1876: an epic's cards as the ordered checkpoints one session sweeps. */
class EpicCheckpointsTest {

    private static List<String> keys(List<EpicCheckpoints.Checkpoint> checkpoints) {
        return checkpoints.stream().map(c -> c.card().key()).toList();
    }

    @Test
    void aCardBlockedByASiblingComesAfterItWhateverItsRank() {
        Card e = epic("JAVA-1").card();
        Card api = child("JAVA-2", "JAVA-1").rank(5).card();
        Card ui = child("JAVA-3", "JAVA-1").rank(0).card();
        Card docs = child("JAVA-4", "JAVA-1").rank(1).card();

        List<EpicCheckpoints.Checkpoint> checkpoints = EpicCheckpoints.of("JAVA-1", List.of(e, api, ui, docs),
                List.of(blocks(api, ui)));

        assertThat(keys(checkpoints)).containsExactly("JAVA-4", "JAVA-2", "JAVA-3");
    }

    @Test
    void cardsNoSiblingOrdersKeepTheBoardOrderAndTheTestCardRunsLast() {
        Card e = epic("JAVA-1").card();
        Card test = child("JAVA-2", "JAVA-1").category(Category.TESTING).tags(EpicCheckpoints.TEST_TAG).card();
        Card second = child("JAVA-3", "JAVA-1").rank(2).card();
        Card first = child("JAVA-4", "JAVA-1").rank(1).card();

        assertThat(keys(EpicCheckpoints.of("JAVA-1", List.of(e, test, second, first), List.of())))
                .containsExactly("JAVA-4", "JAVA-3", "JAVA-2");
    }

    @Test
    void aRejectedCardAndANestedEpicAreNoCheckpoints() {
        Card e = epic("JAVA-1").card();
        Card rejected = child("JAVA-2", "JAVA-1").status(Status.REJECTED).card();
        Card nested = child("JAVA-3", "JAVA-1").category(Category.EPIC).card();
        Card kept = child("JAVA-4", "JAVA-1").card();

        assertThat(keys(EpicCheckpoints.of("JAVA-1", List.of(e, rejected, nested, kept), List.of())))
                .containsExactly("JAVA-4");
    }

    @Test
    void everyEpicCountsItsCompletedCheckpointsFromOneReadOfTheProject() {
        Card one = epic("JAVA-1").card();
        Card empty = epic("JAVA-9").card();
        List<Card> project = List.of(one, empty, standalone("JAVA-5"),
                child("JAVA-2", "JAVA-1").status(Status.REVIEW).card(),
                child("JAVA-3", "JAVA-1").status(Status.DOING).card(),
                child("JAVA-4", "JAVA-1").status(Status.REJECTED).card());

        assertThat(EpicCheckpoints.progressByEpic(project)).containsOnly(
                java.util.Map.entry("JAVA-1", new EpicCheckpoints.Progress(1, 2)),
                java.util.Map.entry("JAVA-9", new EpicCheckpoints.Progress(0, 0)));
    }

    @Test
    void theStateFollowsTheStatus() {
        Card e = epic("JAVA-1").card();
        List<Card> project = List.of(e, child("JAVA-2", "JAVA-1").status(Status.REFINE).card(),
                child("JAVA-3", "JAVA-1").status(Status.TODO).card(),
                child("JAVA-4", "JAVA-1").status(Status.DOING).card(),
                child("JAVA-5", "JAVA-1").status(Status.REVIEW).card(),
                child("JAVA-6", "JAVA-1").status(Status.DONE).card());

        List<EpicCheckpoints.Checkpoint> checkpoints = EpicCheckpoints.of("JAVA-1", project, List.of());

        assertThat(checkpoints).extracting(EpicCheckpoints.Checkpoint::state).containsExactly(
                EpicCheckpoints.State.PENDING, EpicCheckpoints.State.PENDING, EpicCheckpoints.State.IN_PROGRESS,
                EpicCheckpoints.State.COMPLETED, EpicCheckpoints.State.COMPLETED);
        assertThat(checkpoints.getFirst().planned()).isFalse();
        assertThat(checkpoints.get(1).planned()).isTrue();
        assertThat(EpicCheckpoints.progress(checkpoints)).isEqualTo(new EpicCheckpoints.Progress(2, 5));
    }

    @Test
    void aCompletedSiblingDoesNotHoldACheckpointBackButAnUnfinishedOutsiderDoes() {
        Card e = epic("JAVA-1").card();
        Card done = child("JAVA-2", "JAVA-1").status(Status.REVIEW).card();
        Card after = child("JAVA-3", "JAVA-1").card();
        Card outsider = standalone("JAVA-4");
        Card waiting = child("JAVA-5", "JAVA-1").card();

        List<EpicCheckpoints.Checkpoint> checkpoints = EpicCheckpoints.of("JAVA-1",
                List.of(e, done, after, outsider, waiting), List.of(blocks(done, after), blocks(outsider, waiting)));

        EpicCheckpoints.Checkpoint unblockedBySweep = checkpoints.stream()
                .filter(c -> c.card().key().equals("JAVA-3")).findFirst().orElseThrow();
        EpicCheckpoints.Checkpoint heldOutside = checkpoints.stream()
                .filter(c -> c.card().key().equals("JAVA-5")).findFirst().orElseThrow();
        assertThat(unblockedBySweep.blocked()).isTrue();
        assertThat(unblockedBySweep.ready()).isTrue();
        assertThat(unblockedBySweep.sweepable()).isTrue();
        assertThat(heldOutside.ready()).isFalse();
        assertThat(heldOutside.sweepable()).isFalse();
    }

    @Test
    void aSweepWorksTheCheckpointInProgressFirstAndNeverASpikeAHumanCardOrAnUnplannedOne() {
        Card e = epic("JAVA-1").card();
        List<Card> project = List.of(e, child("JAVA-2", "JAVA-1").category(Category.SPIKE).card(),
                child("JAVA-3", "JAVA-1").human().card(), child("JAVA-4", "JAVA-1").status(Status.REFINE).card(),
                child("JAVA-5", "JAVA-1").rank(1).card(), child("JAVA-6", "JAVA-1").rank(2)
                        .status(Status.DOING).card());

        List<EpicCheckpoints.Checkpoint> checkpoints = EpicCheckpoints.of("JAVA-1", project, List.of());

        assertThat(checkpoints.stream().filter(EpicCheckpoints.Checkpoint::sweepable).map(c -> c.card().key()))
                .containsExactlyInAnyOrder("JAVA-5", "JAVA-6");
        assertThat(EpicCheckpoints.next(checkpoints)).map(c -> c.card().key()).contains("JAVA-6");
    }

    @Test
    void anEpicWithNothingLeftToSweepHasNoNextCheckpoint() {
        Card e = epic("JAVA-1").card();
        List<Card> project = List.of(e, child("JAVA-2", "JAVA-1").status(Status.REVIEW).card());

        assertThat(EpicCheckpoints.next(EpicCheckpoints.of("JAVA-1", project, List.of()))).isEmpty();
    }
}
