package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** card://JAVA-1778: the work rules' token estimate matches the vectors the web page is pinned to as well. */
class WorkRuleTokensTest {

    private static final String VECTORS = "/work-rule-token-vectors.tsv";

    @Test
    void theEstimateMatchesTheSharedVectors() throws IOException {
        try (InputStream in = WorkRuleTokensTest.class.getResourceAsStream(VECTORS)) {
            assertThat(in).as(VECTORS).isNotNull();
            List<String> lines = new String(in.readAllBytes(), StandardCharsets.UTF_8).lines().toList();
            assertThat(lines.get(0)).isEqualTo("quota\t" + WorkRuleTokens.TOKEN_QUOTA);
            for (String line : lines.subList(1, lines.size())) {
                String[] cells = line.split("\t", -1);
                assertThat(WorkRuleTokens.estimate(cells[1])).as(cells[1])
                        .isEqualTo(Integer.parseInt(cells[0]));
            }
        }
    }

    @Test
    void theTotalIsTheSumOfTheRules() {
        assertThat(WorkRuleTokens.total(List.of("a", "aaaaa", "  padded  "))).isEqualTo(5);
    }
}
