package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * {@code source} tells time a person typed from time imputed from an agent's run (JAVA-50) or
 * session (JAVA-245). Imputed time also says what it was spent on ({@code concept}), the span it
 * covers, and -- from a session -- the model, the effort it ran at (JAVA-584) and its tokens, and the
 * subagent that spent them. A session's entry also keeps the work profile its project had active ({@code profileId},
 * card://JAVA-1527), null under Officium's defaults and on every other kind of entry. {@code attended} says whether
 * a person had a window open while the session ran (card://JAVA-1047); null when nobody said, which the value
 * report counts as not attended.
 *
 * <p>An entry imputed from a session may have zero hours: a subagent that answered in ten seconds
 * spent no measurable time and still spent tokens, and those are what the entry is for.
 */
public record CardTimeEntry(UUID id, UUID cardId, LocalDate date, double hours, String who,
        UUID accountId, String note, Instant createdAt, TimeSource source, TimeConcept concept, String model,
        String effort, TokenUsage tokens, Instant startedAt, Instant endedAt, String sessionRef, String subagent,
        String profileId, Boolean attended) {

    public CardTimeEntry {
        source = source == null ? TimeSource.MANUAL : source;
        if (hours < 0 || (hours == 0 && source != TimeSource.AGENT_SESSION)) {
            throw new IllegalArgumentException("hours must be positive");
        }
        concept = concept == null ? TimeConcept.WORK : concept;
    }

    /** An entry written before the value report knew whether a person was attended. */
    public CardTimeEntry(UUID id, UUID cardId, LocalDate date, double hours, String who, UUID accountId, String note,
            Instant createdAt, TimeSource source, TimeConcept concept, String model, String effort, TokenUsage tokens,
            Instant startedAt, Instant endedAt, String sessionRef, String subagent, String profileId) {
        this(id, cardId, date, hours, who, accountId, note, createdAt, source, concept, model, effort, tokens,
                startedAt, endedAt, sessionRef, subagent, profileId, null);
    }

    /** An entry with no work profile: a person's, a run's, or a session's before one is known. */
    public CardTimeEntry(UUID id, UUID cardId, LocalDate date, double hours, String who, UUID accountId, String note,
            Instant createdAt, TimeSource source, TimeConcept concept, String model, String effort, TokenUsage tokens,
            Instant startedAt, Instant endedAt, String sessionRef, String subagent) {
        this(id, cardId, date, hours, who, accountId, note, createdAt, source, concept, model, effort, tokens,
                startedAt, endedAt, sessionRef, subagent, null);
    }

    /** Time with no span, model or tokens: what a person logs. */
    public CardTimeEntry(UUID id, UUID cardId, LocalDate date, double hours, String who, UUID accountId,
            String note, Instant createdAt, TimeSource source) {
        this(id, cardId, date, hours, who, accountId, note, createdAt, source, TimeConcept.WORK, null, null, null,
                null, null, null, null);
    }

    /** The same entry with a person's edits: date, hours, who and note are the editable fields. */
    public CardTimeEntry edited(LocalDate newDate, double newHours, String newWho, String newNote) {
        return new CardTimeEntry(id, cardId, newDate, newHours, newWho, accountId, newNote, createdAt, source,
                concept, model, effort, tokens, startedAt, endedAt, sessionRef, subagent, profileId, attended);
    }

    /** The same entry under the work profile its project had active. */
    public CardTimeEntry withProfile(String newProfileId) {
        return new CardTimeEntry(id, cardId, date, hours, who, accountId, note, createdAt, source, concept, model,
                effort, tokens, startedAt, endedAt, sessionRef, subagent, newProfileId, attended);
    }

    /** The same entry, marked attended or not by the window its session ran in. */
    public CardTimeEntry withAttended(Boolean newAttended) {
        return new CardTimeEntry(id, cardId, date, hours, who, accountId, note, createdAt, source, concept, model,
                effort, tokens, startedAt, endedAt, sessionRef, subagent, profileId, newAttended);
    }
}
