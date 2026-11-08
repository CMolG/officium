package com.javadaba.contexts.officium.domain.github;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CardKeyScannerTest {

    @Test
    void readsEveryKeyOfASquashBodyInOrderAndOnce() {
        String squash = """
                Officium docs and changelog (#90)

                * feat(officium): documentation pages (JAVA-130)
                * fix(ui): the menu on phones (JAVA-151, JDB-042)
                * test: attest it (JAVA-130)
                """;

        assertThat(CardKeyScanner.scan(squash)).containsExactly("JAVA-130", "JAVA-151", "JDB-042");
    }

    @Test
    void isWordBoundedSoAShortKeyIsNotReadInsideALongerOne() {
        // XJAVA-1 is a candidate of its own (prefix XJAVA, which the project lookup drops), never JAVA-1.
        assertThat(CardKeyScanner.scan("fix: JAVA-12 and XJAVA-1, JAVA-1234"))
                .containsExactly("JAVA-12", "XJAVA-1", "JAVA-1234")
                .doesNotContain("JAVA-1");
        assertThat(CardKeyScanner.scan("JAVA-1")).containsExactly("JAVA-1");
    }

    @Test
    void readsLowerCaseBranchNamesAsKeys() {
        assertThat(CardKeyScanner.scan("wt/java-130")).containsExactly("JAVA-130");
        assertThat(CardKeyScanner.scan("feat/JAVA-375-github")).containsExactly("JAVA-375");
    }

    @Test
    void aLongSquashBodyIsReadWholeLookAlikesIncluded() {
        // card://JAVA-375: a cap of 50 candidates dropped every key past the 50th, the newest cards of a big PR.
        StringBuilder squash = new StringBuilder("Collected work (#90)\n\n");
        for (int i = 1; i <= 60; i++) {
            squash.append("* chore: pin UTF-").append(i).append(" and ROUND-").append(i).append('\n');
        }
        squash.append("* feat(officium): GitHub on cards (JAVA-375)\n");

        assertThat(CardKeyScanner.scan(squash.toString())).hasSize(121).endsWith("JAVA-375");
    }

    @Test
    void anOverlongTextStopsAtTheCap() {
        StringBuilder text = new StringBuilder();
        for (int i = 1; i <= CardKeyScanner.MAX_KEYS + 10; i++) {
            text.append("JAVA-").append(i).append(' ');
        }

        assertThat(CardKeyScanner.scan(text.toString())).hasSize(CardKeyScanner.MAX_KEYS);
    }

    @Test
    void nullAndKeylessTextsGiveNothing() {
        assertThat(CardKeyScanner.scan(null, "", "chore: bump deps")).isEmpty();
    }
}
