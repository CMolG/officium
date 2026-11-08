package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CardKeysTest {

    @Test
    void formats_prefix_and_sequential_number() {
        assertThat(CardKeys.format("OFF", 12)).isEqualTo("OFF-12");
    }

    @Test
    void validates_the_key_prefix_pattern() {
        assertThat(CardKeys.isValidPrefix("OFF")).isTrue();
        assertThat(CardKeys.isValidPrefix("A1")).isTrue();
        assertThat(CardKeys.isValidPrefix("a")).isFalse();
        assertThat(CardKeys.isValidPrefix("O")).isFalse();
        assertThat(CardKeys.isValidPrefix("OFF-1")).isFalse();
        assertThat(CardKeys.isValidPrefix("TOOLONGPREFIX")).isFalse();
    }

    @Test
    void a_uuid_does_not_look_like_a_key() {
        assertThat(CardKeys.looksLikeKey(UUID.randomUUID().toString())).isFalse();
        assertThat(CardKeys.looksLikeKey("OFF-12")).isTrue();
    }
}
