package com.javadaba.contexts.officium.domain;

/**
 * What a rule gives a card when it enters the rule: a priority floor (null means none) and the sprint
 * it joins (JAVA-1686, ADR 0032).
 */
public record PrecedenceDefaults(Priority priority, PrecedenceSprint sprint) {
}
