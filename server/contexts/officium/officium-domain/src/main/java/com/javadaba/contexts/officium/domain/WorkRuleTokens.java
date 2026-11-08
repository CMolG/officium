package com.javadaba.contexts.officium.domain;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * The token estimate of a project's work rules (JAVA-1778): ceil(UTF-8 bytes of the trimmed rule / 4), the estimate
 * Fluxor's harness preview already uses. The web page counts with the same formula, and both are pinned by one shared
 * vectors file, so the number a person sees is the number the server refuses on.
 */
public final class WorkRuleTokens {

    /** The most the project's work rules may cost every agent call, in estimated tokens. */
    public static final int TOKEN_QUOTA = 1500;

    private WorkRuleTokens() {
    }

    public static int estimate(String text) {
        int bytes = text.strip().getBytes(StandardCharsets.UTF_8).length;
        return (bytes + 3) / 4;
    }

    public static int total(List<String> items) {
        return items.stream().mapToInt(WorkRuleTokens::estimate).sum();
    }
}
