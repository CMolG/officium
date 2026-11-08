package com.javadaba.contexts.officium.domain;

import java.nio.charset.StandardCharsets;
import java.util.Collection;

/**
 * How much of the free allowance a project owner has used (JDB-241, user decision 2026-09-15:
 * free up to 15 MB of card data). What is counted is the text Officium keeps -- titles,
 * descriptions, epics, tags, comments, time-entry notes, attachment names and paths, and the
 * documentation pages (JAVA-130) -- in UTF-8 bytes. File contents never count: they live on the agent's machine, not on our disk.
 */
public record StorageUsage(long usedBytes, long limitBytes) {

    public StorageUsage {
        if (usedBytes < 0 || limitBytes < 0) {
            throw new IllegalArgumentException("usage and limit cannot be negative");
        }
    }

    /** A write that adds nothing (or frees space) always fits, even over the limit: shrinking an
     *  over-quota backlog must stay possible. */
    public boolean fits(long addedBytes) {
        return addedBytes <= 0 || usedBytes + addedBytes <= limitBytes;
    }

    /** UTF-8 size of every non-null value, the same measure the repository sums in SQL. */
    public static long bytesOf(String... values) {
        long total = 0;
        for (String value : values) {
            total += value == null ? 0 : value.getBytes(StandardCharsets.UTF_8).length;
        }
        return total;
    }

    public static long bytesOf(Collection<String> values) {
        return values == null ? 0 : bytesOf(values.toArray(String[]::new));
    }
}
