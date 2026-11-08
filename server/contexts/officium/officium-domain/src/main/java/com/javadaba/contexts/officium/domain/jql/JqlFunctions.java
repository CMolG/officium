package com.javadaba.contexts.officium.domain.jql;

import java.util.Map;

/** The Java twin of {@code jql.ts}'s {@code FUNCTIONS} table. */
final class JqlFunctions {

    private static final Map<String, JqlFunction> BY_NAME = Map.of(
            "currentuser", JqlFunction.CURRENT_USER,
            "now", JqlFunction.NOW,
            "startofday", JqlFunction.START_OF_DAY,
            "startofweek", JqlFunction.START_OF_WEEK);

    private JqlFunctions() {
    }

    /** {@code lower} already lower-cased by the caller, same as {@code jql.ts}'s
     *  {@code FUNCTIONS[t.value.toLowerCase()]}. */
    static JqlFunction byName(String lower) {
        return BY_NAME.get(lower);
    }
}
