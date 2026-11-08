package com.javadaba.contexts.officium.application;

import java.time.Instant;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * JAVA-562 (contract §4.3): what an agent window's status line last said about it -- context, model,
 * cost and the account's limits -- so the person can pick which of their windows to queue into.
 *
 * <p>Flat on purpose: it is also the body of {@code PUT /sessions/{id}/telemetry}, and a flat record
 * needs no nested types registered for reflection (invariant 8). Every field is optional; Claude Code
 * leaves several out until the first answer, and some only exist on some plans.
 *
 * <p>It is personal data (paths, repository, cost) and only its own account ever reads it: it lives on
 * the window's in-memory presence, rides {@code GET /sessions}, and never goes on the project's live
 * channel, which every member reads.
 */
public record WindowTelemetry(
        Double contextUsedPercent, Long contextInputTokens, Long contextWindowSize,
        String modelId, String modelName, String effort, Boolean thinking, Boolean fastMode,
        Double costUsd, Long durationMs, Long apiDurationMs, Long linesAdded, Long linesRemoved,
        Double fiveHourUsedPercent, Instant fiveHourResetsAt, Double sevenDayUsedPercent, Instant sevenDayResetsAt,
        String sessionName, String projectDir, String gitWorktree, String repo, Long prNumber, String prUrl,
        String version, Instant reportedAt) {

    private static final Pattern EFFORT = Pattern.compile("[a-z]{1,16}");
    private static final Pattern URL = Pattern.compile("https://[^\\s\"<>]{1,292}");

    /** What the window sent, bounded and stamped with the server's time: the client never sets when. */
    WindowTelemetry sanitized(Instant now) {
        String level = clean(effort, 16);
        level = level == null ? null : level.toLowerCase(Locale.ROOT);
        return new WindowTelemetry(
                percent(contextUsedPercent), count(contextInputTokens), count(contextWindowSize),
                clean(modelId, 80), clean(modelName, 80),
                level != null && EFFORT.matcher(level).matches() ? level : null,
                thinking, fastMode,
                costUsd == null || costUsd.isNaN() || costUsd < 0 ? null : Math.min(costUsd, 1_000_000d),
                count(durationMs), count(apiDurationMs), count(linesAdded), count(linesRemoved),
                percent(fiveHourUsedPercent), fiveHourResetsAt, percent(sevenDayUsedPercent), sevenDayResetsAt,
                clean(sessionName, 120), clean(projectDir, 300), clean(gitWorktree, 120), clean(repo, 200),
                count(prNumber), prUrl != null && URL.matcher(prUrl).matches() ? prUrl : null,
                clean(version, 32), now);
    }

    private static Double percent(Double value) {
        if (value == null || value.isNaN() || value.isInfinite()) {
            return null;
        }
        return Math.round(Math.clamp(value, 0d, 100d) * 10) / 10d;
    }

    private static Long count(Long value) {
        return value == null || value < 0 ? null : value;
    }

    static String clean(String value, int max) {
        if (value == null) {
            return null;
        }
        String stripped = value.replaceAll("\\p{Cntrl}", " ").strip();
        if (stripped.isEmpty()) {
            return null;
        }
        return stripped.length() > max ? stripped.substring(0, max) : stripped;
    }
}
