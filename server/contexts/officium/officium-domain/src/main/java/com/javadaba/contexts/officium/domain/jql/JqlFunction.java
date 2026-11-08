package com.javadaba.contexts.officium.domain.jql;

/** {@code currentUser()}, {@code now()}, {@code startOfDay()}, {@code startOfWeek()} -- the Java
 *  twin of {@code jql.ts}'s {@code JqlValue["fn"]} union (contract JDB-270). */
public enum JqlFunction {
    CURRENT_USER, NOW, START_OF_DAY, START_OF_WEEK
}
