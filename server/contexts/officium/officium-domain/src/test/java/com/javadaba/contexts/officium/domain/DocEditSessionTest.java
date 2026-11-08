package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-796: which write continues an editing session (no version kept) and which is a checkpoint. */
class DocEditSessionTest {

    private static final UUID ANA = UUID.randomUUID();
    private static final Instant CHECKPOINT = Instant.parse("2026-10-13T12:00:00Z");
    private static final DocEditSession OPEN = new DocEditSession("s-1", Actor.person(ANA, "Ana"), CHECKPOINT);

    static Stream<Arguments> writes() {
        return Stream.of(
                Arguments.of("the same session and author, a second later", "s-1", Actor.person(ANA, "Ana"), 1, true),
                Arguments.of("the same session, exactly five minutes on", "s-1", Actor.person(ANA, "Ana"), 300, true),
                Arguments.of("the same session, past five minutes", "s-1", Actor.person(ANA, "Ana"), 301, false),
                Arguments.of("another author in the same session id", "s-1", Actor.person(UUID.randomUUID(), "Bo"), 1,
                        false),
                Arguments.of("the same account as an agent", "s-1", Actor.agent(ANA, "Claude Code (ana)"), 1, false),
                Arguments.of("another session of the same author", "s-2", Actor.person(ANA, "Ana"), 1, false),
                Arguments.of("a write that names no session", null, Actor.person(ANA, "Ana"), 1, false));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("writes")
    void aWriteContinuesTheSessionOnlyWhenItIsTheSameSessionBySameAuthorWithinFiveMinutes(String why, String session,
            Actor actor, int secondsLater, boolean continues) {
        assertThat(OPEN.continuedBy(session, actor, CHECKPOINT.plus(Duration.ofSeconds(secondsLater))))
                .as(why).isEqualTo(continues);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"a", "3f2c-session-9", "0123456789012345678901234567890123456789012345678901234567890123"})
    void aClientIdOrNoneIsAccepted(String id) {
        assertThat(DocEditSession.requireValid(id)).isEqualTo(id);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "with space", "slash/no",
            "01234567890123456789012345678901234567890123456789012345678901234"})
    void anythingElseIsRefusedInWords(String id) {
        assertThatThrownBy(() -> DocEditSession.requireValid(id)).isInstanceOfSatisfying(OfficiumException.class,
                ex -> {
                    assertThat(ex.code()).isEqualTo("invalid_edit_session");
                    assertThat(ex.httpStatus()).isEqualTo(400);
                });
    }
}
