package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * JAVA-801: what a page made from a template reads, and where a template lives. The web's
 * {@code e2e/doc-templates-units.spec.ts} runs the same fill cases against its twin.
 */
class DocTemplateTest {

    private static final ZonedDateTime AT = Instant.parse("2026-10-13T15:42:30Z").atZone(ZoneOffset.UTC);

    @ParameterizedTest(name = "{0} -> {1}")
    @CsvSource(delimiter = '|', textBlock = """
            {date}                         | 2026-10-13
            {time}                         | 15:42
            {datetime}                     | 2026-10-13 15:42
            {author}                       | Ana
            Notes {date} by {author}       | Notes 2026-10-13 by Ana
            {date} and {date} again        | 2026-10-13 and 2026-10-13 again
            {x} {Date} {date              | {x} {Date} {date
            {{date}}                       | {2026-10-13}
            no variables                   | no variables
            """)
    void fillsTheFourVariablesAndKeepsEveryOtherBraceAsWritten(String text, String filled) {
        assertThat(DocTemplate.fill(text, AT, "Ana")).isEqualTo(filled);
    }

    @Test
    void theDateIsTheCallersOwnSoMidnightFallsOnEitherSideOfIt() {
        ZonedDateTime late = Instant.parse("2026-10-13T23:30:00Z").atZone(ZoneOffset.UTC);

        assertThat(DocTemplate.fill("{datetime}", late, "Ana")).isEqualTo("2026-10-13 23:30");
        assertThat(DocTemplate.fill("{datetime}", late.withZoneSameInstant(DocTemplate.zone("Europe/Madrid")), "Ana"))
                .isEqualTo("2026-10-14 01:30");
        assertThat(DocTemplate.fill("{date}", late.withZoneSameInstant(DocTemplate.zone("America/Los_Angeles")),
                "Ana")).isEqualTo("2026-10-13");
    }

    @Test
    void anAuthorIsFilledVerbatimEvenWhenTheNameLooksLikeAVariable() {
        assertThat(DocTemplate.fill("By {author}", AT, "Claude Code (cmolgal)"))
                .isEqualTo("By Claude Code (cmolgal)");
        assertThat(DocTemplate.fill("{author}", AT, "{date} $1 \\")).isEqualTo("{date} $1 \\");
    }

    @Test
    void noTimeZoneIsUtcAndOneThatIsNotAZoneIsRefused() {
        assertThat(DocTemplate.zone(null)).isEqualTo(ZoneOffset.UTC);
        assertThat(DocTemplate.zone(" ")).isEqualTo(ZoneOffset.UTC);
        assertThat(DocTemplate.zone("Europe/Madrid")).isEqualTo(ZoneId.of("Europe/Madrid"));
        assertThatThrownBy(() -> DocTemplate.zone("Mars/Olympus"))
                .isInstanceOfSatisfying(OfficiumException.class, ex -> {
                    assertThat(ex.code()).isEqualTo("invalid_time_zone");
                    assertThat(ex.httpStatus()).isEqualTo(400);
                });
    }

    @ParameterizedTest(name = "{0} belongs to {1}")
    @CsvSource(nullValues = "project", textBlock = """
            meeting-notes,                  project
            contracts/review-template,      contracts
            history/plans/weekly-template,  history
            """)
    void aTemplateBelongsToTheCollectionOfItsFirstSegmentOrAtDepthOneToTheProject(String path, String collection) {
        assertThat(DocTemplate.collectionOf(path)).isEqualTo(collection);
    }
}
