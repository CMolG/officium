package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/**
 * One quick action an agent working a card asks its person for, and waits on (JAVA-1122): "open a
 * tmux session", "leave the key in that file". It is not a card: it lives on the agent's own card,
 * is answered with one click, and is closed once the agent resumes.
 *
 * <p>The texts are checked here, so no adapter can store a request a person could not read: a
 * one-line action, an optional Markdown detail, and an optional reason. A person's note is plain
 * text and short, and it is for "done, session jdb" -- never a secret, which the API says too.
 */
public record CardRequest(UUID id, UUID projectId, UUID cardId, String action, String detail, String why,
        Status status, Actor createdBy, Instant createdAt, Actor answeredBy, Instant answeredAt, String note,
        Instant closedAt) {

    public static final int ACTION_MAX = 140;
    public static final int DETAIL_MAX = 2000;
    public static final int WHY_MAX = 500;
    public static final int NOTE_MAX = 500;

    public enum Status {
        OPEN, DONE, DECLINED, CLOSED;

        public String wire() {
            return name().toLowerCase(Locale.ROOT);
        }

        public static Status fromWire(String value) {
            for (Status status : values()) {
                if (status.wire().equals(value)) {
                    return status;
                }
            }
            throw new IllegalArgumentException("Unknown request status: " + value);
        }
    }

    public CardRequest {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(projectId, "projectId");
        Objects.requireNonNull(cardId, "cardId");
        Objects.requireNonNull(action, "action");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(createdBy, "createdBy");
        Objects.requireNonNull(createdAt, "createdAt");
    }

    /** A new request, its texts checked and trimmed; refused with the reason in words when one is wrong. */
    public static CardRequest open(UUID projectId, UUID cardId, String action, String detail, String why,
            Actor createdBy, Instant now) {
        String oneLine = action == null ? "" : action.strip();
        if (oneLine.isEmpty()) {
            throw OfficiumException.badRequest("request_action_required",
                    "Say in one line what the person must do, like \"Open a root tmux session on the server\"");
        }
        if (oneLine.contains("\n") || oneLine.length() > ACTION_MAX) {
            throw OfficiumException.badRequest("request_action_invalid", "The action is one line of at most "
                    + ACTION_MAX + " characters; put steps or the command in `detail`");
        }
        return new CardRequest(UUID.randomUUID(), projectId, cardId, oneLine, optional(detail, DETAIL_MAX, "detail"),
                optional(why, WHY_MAX, "why"), Status.OPEN, createdBy, now, null, null, null, null);
    }

    /** The person's note on an answer: optional, plain text, short. */
    public static String note(String note) {
        return optional(note, NOTE_MAX, "note");
    }

    /** Waiting on the person, or answered and waiting on the agent to resume. */
    public boolean live() {
        return status != Status.CLOSED;
    }

    private static String optional(String value, int max, String field) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String stripped = value.strip();
        if (stripped.length() > max) {
            throw OfficiumException.badRequest("request_" + field + "_too_long",
                    "The request's " + field + " is at most " + max + " characters");
        }
        return stripped;
    }
}
