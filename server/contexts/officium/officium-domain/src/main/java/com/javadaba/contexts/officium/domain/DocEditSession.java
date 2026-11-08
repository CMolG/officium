package com.javadaba.contexts.officium.domain;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * The editing session a page's last checkpoint opened (JAVA-796, refining design §4). A page edited
 * in place autosaves every pause, and keeping a version per pause would leave the history's "two
 * latest previous versions" seconds old and add an activity row per save. So a write may name its
 * session: one by the same author in the same session, within {@link #WINDOW} of the checkpoint
 * that opened it, continues it and keeps no version. Any other write is a checkpoint, as before.
 * This is Outline's "a revision every 5 minutes".
 */
public record DocEditSession(String id, Actor author, Instant checkpointAt) {

    public static final Duration WINDOW = Duration.ofMinutes(5);
    public static final int MAX_ID_LENGTH = 64;

    private static final Pattern ID = Pattern.compile("[A-Za-z0-9-]{1," + MAX_ID_LENGTH + "}");

    public DocEditSession {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(author, "author");
        Objects.requireNonNull(checkpointAt, "checkpointAt");
    }

    /** {@code null} (no session) passes; anything else must be a client's id, never free text. */
    public static String requireValid(String id) {
        if (id != null && !ID.matcher(id).matches()) {
            throw OfficiumException.badRequest("invalid_edit_session", "editSession is up to " + MAX_ID_LENGTH
                    + " letters, digits and hyphens, the same for every save of one editing session");
        }
        return id;
    }

    /** Whether a write naming {@code session} by {@code actor} at {@code now} continues this one. */
    public boolean continuedBy(String session, Actor actor, Instant now) {
        return session != null && session.equals(id) && actor.kind() == author.kind()
                && actor.accountId().equals(author.accountId()) && !now.isAfter(checkpointAt.plus(WINDOW));
    }
}
