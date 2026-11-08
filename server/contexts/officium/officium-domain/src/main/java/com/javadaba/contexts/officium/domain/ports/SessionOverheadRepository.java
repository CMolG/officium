package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.SessionOverhead;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Usage no card picked up (card://JAVA-1047), kept apart from the card's time entries. */
public interface SessionOverheadRepository {

    void insert(SessionOverhead row);

    /** Replaces what an earlier report of the same session wrote. */
    void deleteBySession(String sessionRef);

    /** The rows of the project whose span starts inside {@code [from, to)}. */
    List<SessionOverhead> listByProjectAndRange(UUID projectId, Instant from, Instant to);
}
