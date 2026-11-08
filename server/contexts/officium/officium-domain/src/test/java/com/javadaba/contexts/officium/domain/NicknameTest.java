package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NicknameTest {

    @Test
    void aNicknameIsTrimmedAndComparedWithoutCase() {
        Nickname nickname = new Nickname("  Carlos97 ");

        assertThat(nickname.value()).isEqualTo("Carlos97");
        assertThat(nickname.key()).isEqualTo(new Nickname("carlos97").key());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "a", "has space", "semi;colon", "0123456789012345678901234567890123"})
    void whatIsNotANicknameIsRefusedInWords(String raw) {
        assertThatThrownBy(() -> new Nickname(raw))
                .isInstanceOfSatisfying(OfficiumException.class,
                        ex -> assertThat(ex.code()).isEqualTo("nickname_invalid"));
    }

    @Test
    void lettersWithAccentsDigitsAndSeparatorsAreANickname() {
        assertThat(new Nickname("José_m.97-x").value()).isEqualTo("José_m.97-x");
    }

    @ParameterizedTest
    @CsvSource({
            "'Claude Code (officium)', carlos97, 'Claude Code (carlos97)'",
            "'Claude Code', carlos97, 'Claude Code (carlos97)'",
            "codex-cli, ana, 'codex-cli (ana)'",
            "'Claude Code (officium)', '', 'Claude Code'",
            "'', ana, 'Agent (ana)'"
    })
    void anAgentIsItsProductAndWhoseItIs(String clientName, String owner, String label) {
        assertThat(Nickname.agentLabel(clientName, owner)).isEqualTo(label);
    }

    @Test
    void anAgentKeepsTheMachineAnEarlierWriteSaidWhenThisOneDoesNot() {
        UUID account = UUID.randomUUID();
        Actor earlier = Actor.agent(account, "Claude Code (ana)", "  CARLOS  ");
        Actor now = Actor.agent(account, "Claude Code (ana)");

        assertThat(earlier.machine()).isEqualTo("CARLOS");
        assertThat(now.rememberingMachineOf(earlier).machine()).isEqualTo("CARLOS");
        assertThat(Actor.agent(account, "x", "OTHER").rememberingMachineOf(earlier).machine()).isEqualTo("OTHER");
        assertThat(Actor.agent(UUID.randomUUID(), "x").rememberingMachineOf(earlier).machine()).isNull();
    }

    @Test
    void aPersonNeverCarriesAMachine() {
        assertThatThrownBy(() -> new Actor(ActorKind.PERSON, UUID.randomUUID(), "ana@example.com", null, "CARLOS"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
