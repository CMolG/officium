package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1858: what shuffle mode draws, and what it leaves as the profile configures it. */
class RunShuffleTest {

    private static final RoleMatrix ECO = WorkProfiles.builtin(WorkProfiles.ECO).orElseThrow().matrix();
    private static final RoleMatrix STANDARD = WorkProfiles.builtin(WorkProfiles.STANDARD).orElseThrow().matrix();

    private static RunConfig drawn(RoleMatrix matrix, UUID card, Category category, Status status) {
        return RunShuffle.over(matrix).apply(card, category, null, status,
                matrix.runConfig(category, null, status).orElseThrow());
    }

    private static Set<RunConfig> drawsOver(RoleMatrix matrix, Category category, Status status, int cards) {
        Set<RunConfig> seen = new HashSet<>();
        IntStream.range(0, cards).forEach(i -> seen.add(drawn(matrix, UUID.randomUUID(), category, status)));
        return seen;
    }

    @Test
    void ecoDrawsOnlySonnetAtLowToXhighBecauseItBuildsAndDeploysOnNoOtherModel() {
        // Eco plans on Opus (card://JAVA-2091), but planning is never shuffled: the ceiling is read from what is.
        Set<RunConfig> seen = drawsOver(ECO, Category.FEATURE, Status.DOING, 2_000);

        Set<RunConfig> pool = new HashSet<>();
        RunShuffle.EFFORTS.forEach(effort -> pool.add(new RunConfig("claude-sonnet-5-5", effort)));
        assertThat(seen).isEqualTo(pool);
    }

    @Test
    void ecoDeployIsShuffledToo() {
        assertThat(drawsOver(ECO, Category.BUG, Status.DEPLOY, 2_000)).hasSize(4);
    }

    @Test
    void standardReachesOpusFromSonnetBecauseItsCeilingIsOpus() {
        Set<RunConfig> seen = drawsOver(STANDARD, Category.FEATURE, Status.DOING, 3_000);

        assertThat(seen).hasSize(12);
        assertThat(seen.stream().map(RunConfig::model).distinct())
                .containsExactlyInAnyOrder("claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5");
    }

    @Test
    void planningAnalysisAndReviewKeepTheirCell() {
        for (Status status : Set.of(Status.REFINE, Status.READY, Status.REVIEW)) {
            assertThat(drawsOver(ECO, Category.FEATURE, status, 200))
                    .containsExactly(ECO.runConfig(Category.FEATURE, null, status).orElseThrow());
        }
    }

    @Test
    void researchAndSecurityKeepTheirCell() {
        for (Category category : Set.of(Category.SPIKE, Category.SECURITY)) {
            assertThat(drawsOver(ECO, category, Status.DOING, 200))
                    .containsExactly(new RunConfig("claude-sonnet-5-5", Effort.HIGH));
        }
    }

    @Test
    void theSameCardInTheSamePhaseDrawsTheSamePairOnEveryRead() {
        UUID card = UUID.randomUUID();
        RunConfig first = drawn(ECO, card, Category.FEATURE, Status.TODO);

        assertThat(drawn(ECO, card, Category.FEATURE, Status.DOING)).isEqualTo(first);
        assertThat(IntStream.range(0, 50).mapToObj(i -> drawn(ECO, card, Category.FEATURE, Status.DOING)))
                .containsOnly(first);
    }

    @Test
    void theDrawsSpreadEvenlyAcrossThePool() {
        int cards = 8_000;
        java.util.Map<RunConfig, Integer> counts = new java.util.HashMap<>();
        IntStream.range(0, cards).forEach(i -> counts.merge(drawn(ECO, UUID.randomUUID(), Category.FEATURE,
                Status.DOING), 1, Integer::sum));

        assertThat(counts.values()).allSatisfy(count -> assertThat(count).isBetween(1_600, 2_400));
    }

    @Test
    void offAndForeignModelsKeepTheConfiguredCell() {
        RunConfig configured = new RunConfig("claude-haiku-5-5", Effort.MEDIUM);
        assertThat(RunShuffle.OFF.apply(UUID.randomUUID(), Category.FEATURE, null, Status.DOING, configured))
                .isSameAs(configured);

        RunConfig foreign = new RunConfig("gpt-9", Effort.MEDIUM);
        assertThat(RunShuffle.over(ECO).apply(UUID.randomUUID(), Category.FEATURE, null, Status.DOING, foreign))
                .isSameAs(foreign);
    }
}
