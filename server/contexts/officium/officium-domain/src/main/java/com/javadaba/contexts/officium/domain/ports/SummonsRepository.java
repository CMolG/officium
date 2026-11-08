package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.Summons;
import com.javadaba.contexts.officium.domain.SummonsItem;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The summons rounds (JAVA-1145), and the set of things a person is pending on. */
public interface SummonsRepository {

    /** Open requests on AI cards, and unanswered forms of human cards that block a card an agent will work. */
    List<SummonsItem> pending(UUID projectId, UUID accountId);

    Optional<Summons> findOpen(UUID accountId, UUID projectId);

    Optional<Summons> find(UUID summonsId);

    List<Summons> openFor(UUID accountId);

    /** Inserts, or overwrites the account's open summons for the project. */
    void save(Summons summons);
}
