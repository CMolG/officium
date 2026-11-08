package com.javadaba.contexts.officium.domain;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** JAVA-1445: the most a session that works a role may do with its tools, narrowest first. */
class ToolTierTest {

    @Test
    void readsItsWireValuesAndOrdersNarrowestFirst() {
        assertThat(ToolTier.fromWire("read")).isEqualTo(ToolTier.READ);
        assertThat(ToolTier.fromWire("comment").wire()).isEqualTo("comment");
        assertThat(ToolTier.fromWire("write")).isEqualTo(ToolTier.WRITE);
        assertThat(ToolTier.READ).isLessThan(ToolTier.COMMENT);
        assertThat(ToolTier.COMMENT).isLessThan(ToolTier.WRITE);
    }

    @Test
    void refusesAnyOtherValue() {
        assertThatThrownBy(() -> ToolTier.fromWire("admin")).isInstanceOf(OfficiumException.class);
        assertThatThrownBy(() -> ToolTier.fromWire(null)).isInstanceOf(OfficiumException.class);
    }
}
