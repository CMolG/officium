package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

/** JAVA-799: how long a person's Recent may be. */
class DocViewsTest {

    @ParameterizedTest
    @CsvSource({"5,5", "50,50", "51,50", "9999,50", "0,1", "-4,1"})
    void aRequestedLengthIsHeldToTheKeptRange(int requested, int expected) {
        assertThat(DocViews.limit(requested)).isEqualTo(expected);
    }

    @org.junit.jupiter.api.Test
    void noLengthMeansEverythingKept() {
        assertThat(DocViews.limit(null)).isEqualTo(DocViews.KEEP);
    }
}
