package com.javadaba.contexts.officium.domain;

/**
 * The pages a person opened (JAVA-799, design §6): the last {@link #KEEP} per person and project,
 * newest first. Reading history is personal data, so it is bounded and goes with the account.
 */
public final class DocViews {

    /** How many a person's Recent keeps. */
    public static final int KEEP = 50;

    private DocViews() {
    }

    /** A requested list length: absent is everything kept, and anything else is held to 1..{@link #KEEP}. */
    public static int limit(Integer requested) {
        return requested == null ? KEEP : Math.max(1, Math.min(requested, KEEP));
    }
}
