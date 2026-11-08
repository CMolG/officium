package com.javadaba.contexts.officium.domain.github;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Finds the card keys a commit message, branch name or pull request mentions (JAVA-375). A key is a
 * project prefix ({@code [A-Z][A-Z0-9]{1,9}}, contract §3) and a number, bounded on both sides so
 * {@code JAVA-1} is not read inside {@code JAVA-12} or {@code XJAVA-1}.
 *
 * <p>Case-insensitive on purpose: branches here are written {@code wt/java-130}. What comes out is
 * only a CANDIDATE; the caller looks each one up in the project, which is what makes a project's
 * imported prefixes ({@code JDB-}, {@code HUMAN-}) count and drops look-alikes such as {@code UTF-8}.
 */
public final class CardKeyScanner {

    /**
     * Distinct candidates read from one call; the rest are ignored. It counts look-alikes too
     * ({@code UTF-8}, {@code ROUND-2}), and a squash body here lists every commit of a PR that collects
     * many cards: PR #90's names 155 candidates, 145 of them real keys. The payload is already
     * authenticated, so this only keeps a runaway text from turning into unbounded lookups.
     */
    public static final int MAX_KEYS = 1_000;

    private static final Pattern KEY = Pattern
            .compile("(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9]{1,9}-[0-9]{1,9})(?![0-9])");

    private CardKeyScanner() {
    }

    /** Upper-cased candidate keys in order of first appearance, across every text given. */
    public static Set<String> scan(String... texts) {
        Set<String> keys = new LinkedHashSet<>();
        for (String text : texts) {
            if (text == null) {
                continue;
            }
            Matcher matcher = KEY.matcher(text);
            while (matcher.find() && keys.size() < MAX_KEYS) {
                keys.add(matcher.group(1).toUpperCase(Locale.ROOT));
            }
        }
        return keys;
    }
}
