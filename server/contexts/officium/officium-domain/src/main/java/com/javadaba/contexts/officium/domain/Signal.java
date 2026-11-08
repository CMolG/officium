package com.javadaba.contexts.officium.domain;

import java.util.Arrays;
import java.util.Collection;
import java.util.EnumSet;
import java.util.List;

/**
 * Something about a card's work that brings roles its category alone does not (JAVA-294): a card
 * that touches the UI is reviewed for accessibility whatever its category. A field of its own, never
 * a tag (user decision, 2026-09-29): the classifier (JAVA-373) infers them from the request's own
 * wording, and people edit them. The roles each one adds are {@link RoleMatrix}'s.
 */
public enum Signal {
    TOUCHES_AUTH_PERMISSIONS_OR_PERSONAL_DATA("touches-auth-permissions-or-personal-data"), TOUCHES_UI(
            "touches-ui"), TOUCHES_HOT_PATHS_OR_HEAVY_QUERIES(
                    "touches-hot-paths-or-heavy-queries"), TOUCHES_DATA_SCHEMA(
                            "touches-data-schema"), TOUCHES_INFRASTRUCTURE("touches-infrastructure");

    private final String wire;

    Signal(String wire) {
        this.wire = wire;
    }

    public String wire() {
        return wire;
    }

    /** A value a caller sent: an unknown one is their mistake, answered {@code 400 invalid_signal}. */
    public static Signal fromWire(String value) {
        return Arrays.stream(values())
                .filter(s -> s.wire.equals(value))
                .findFirst()
                .orElseThrow(() -> OfficiumException.badRequest("invalid_signal", "Unknown signal: " + value
                        + ". One of: " + String.join(", ", Arrays.stream(values()).map(Signal::wire).toList())));
    }

    /** Wire values to signals, de-duplicated and in declaration order, so equal sets compare equal. */
    public static List<Signal> fromWire(Collection<String> values) {
        EnumSet<Signal> set = EnumSet.noneOf(Signal.class);
        values.forEach(v -> set.add(fromWire(v)));
        return List.copyOf(set);
    }

    public static List<Signal> normalized(Collection<Signal> signals) {
        return signals == null || signals.isEmpty() ? List.of() : List.copyOf(EnumSet.copyOf(signals));
    }
}
