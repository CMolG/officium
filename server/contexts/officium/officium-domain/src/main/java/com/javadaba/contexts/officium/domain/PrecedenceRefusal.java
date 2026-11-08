package com.javadaba.contexts.officium.domain;

/**
 * Why a precedence list is refused: a closed code, the position of the rule in the list sent (a new rule
 * has no id yet) and the field that broke (JAVA-1686).
 */
public record PrecedenceRefusal(String code, int ruleIndex, String field, String message) {
}
