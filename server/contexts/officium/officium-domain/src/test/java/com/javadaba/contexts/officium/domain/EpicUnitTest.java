package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.List;

import static com.javadaba.contexts.officium.domain.EpicFixtures.blocks;
import static com.javadaba.contexts.officium.domain.EpicFixtures.child;
import static com.javadaba.contexts.officium.domain.EpicFixtures.epic;
import static com.javadaba.contexts.officium.domain.EpicFixtures.standalone;
import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1874: in a project that executes by epic, the unit a ranked card is worked in. */
class EpicUnitTest {

    @Test
    void aCardOfAnOpenEpicInToDoIsWorkedAsItsEpicInAction() {
        Card e = epic("JAVA-1").card();
        Card todo = child("JAVA-2", "JAVA-1").card();

        assertThat(EpicUnit.of(todo, List.of(e, todo), List.of()))
                .hasValueSatisfying(unit -> {
                    assertThat(unit.epic().key()).isEqualTo("JAVA-1");
                    assertThat(unit.phase()).isEqualTo(Phase.ACTION);
                });
    }

    @Test
    void aCardInReviewWaitsForTheSweepWhileASiblingCanStillBeBuilt() {
        Card e = epic("JAVA-1").card();
        Card reviewed = child("JAVA-2", "JAVA-1").status(Status.REVIEW).card();
        Card todo = child("JAVA-3", "JAVA-1").card();

        assertThat(EpicUnit.of(reviewed, List.of(e, reviewed, todo), List.of())).map(EpicUnit::phase)
                .contains(Phase.ACTION);
    }

    @Test
    void onceNothingIsLeftToBuildTheEpicIsReviewedWhole() {
        Card e = epic("JAVA-1").card();
        Card reviewed = child("JAVA-2", "JAVA-1").status(Status.REVIEW).card();
        Card refined = child("JAVA-3", "JAVA-1").status(Status.REFINE).card();
        Card heldOutside = child("JAVA-4", "JAVA-1").card();
        Card blocker = standalone("JAVA-5");

        assertThat(EpicUnit.of(reviewed, List.of(e, reviewed, refined, heldOutside, blocker),
                List.of(blocks(blocker, heldOutside)))).map(EpicUnit::phase).contains(Phase.REVIEW);
    }

    @Test
    void aSpikeAHumanCardAndTheRefineReadyAndDeployPhasesAreWorkedAlone() {
        Card e = epic("JAVA-1").card();
        Card spike = child("JAVA-2", "JAVA-1").category(Category.SPIKE).card();
        Card human = child("JAVA-3", "JAVA-1").human().card();
        Card refine = child("JAVA-4", "JAVA-1").status(Status.REFINE).card();
        Card ready = child("JAVA-5", "JAVA-1").status(Status.READY).card();
        Card deploy = child("JAVA-6", "JAVA-1").status(Status.DEPLOY).card();
        List<Card> project = List.of(e, spike, human, refine, ready, deploy);

        for (Card alone : List.of(spike, human, refine, ready, deploy)) {
            assertThat(EpicUnit.of(alone, project, List.of())).as(alone.key()).isEmpty();
        }
    }

    @Test
    void aCardInNoEpicOrInAClosedOneIsItsOwnUnit() {
        Card loose = standalone("JAVA-2");
        Card closed = epic("JAVA-1").status(Status.DONE).card();
        Card ofClosed = child("JAVA-3", "JAVA-1").card();

        assertThat(EpicUnit.of(loose, List.of(loose), List.of())).isEmpty();
        assertThat(EpicUnit.of(ofClosed, List.of(closed, ofClosed), List.of())).isEmpty();
    }

    @Test
    void anEpicIsReadAsAUnitOnlyWhileItHasSomethingToSweepOrReview() {
        Card e = epic("JAVA-1").card();
        Card done = child("JAVA-2", "JAVA-1").status(Status.DONE).card();
        Card todo = child("JAVA-3", "JAVA-1").card();

        assertThat(EpicUnit.ofEpic(e, List.of(e, done), List.of())).isEmpty();
        assertThat(EpicUnit.ofEpic(e, List.of(e, done, todo), List.of())).map(EpicUnit::phase)
                .contains(Phase.ACTION);
        assertThat(EpicUnit.ofEpic(todo, List.of(e, todo), List.of())).isEmpty();
    }
}
