package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.CardTimeEntry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CardTimeEntryRepository {

    CardTimeEntry insert(CardTimeEntry entry);

    Optional<CardTimeEntry> findById(UUID cardId, UUID entryId);

    List<CardTimeEntry> listByCard(UUID cardId);

    CardTimeEntry update(CardTimeEntry entry);

    void delete(UUID cardId, UUID entryId);

    /** For the timesheet report (contract §3): entries of the whole project in {@code [from,to]},
     *  optionally filtered to one person (matched against {@code who}). */
    List<CardTimeEntry> listByProjectAndRange(UUID projectId, LocalDate from, LocalDate to, String person);

    /** Same as {@link #listByProjectAndRange}, each entry with its card's key, in ONE query (JAVA-1376). */
    List<KeyedTimeEntry> listKeyedByProjectAndRange(UUID projectId, LocalDate from, LocalDate to, String person);

    /** The hours logged on each of these cards, in one query; a card with no entry is absent (JAVA-1376). */
    java.util.Map<UUID, Double> totalHoursByCards(Collection<UUID> cardIds);

    /** An entry, the key of the card it belongs to, and the card's title, epic and status as the timesheet
     *  names them (JAVA-1661): all three null once the card is deleted. */
    record KeyedTimeEntry(CardTimeEntry entry, String cardKey, String cardTitle, String cardEpic,
            String cardStatus) {
    }

    /** Every card's logged hours, all time -- what the mean per category averages (JAVA-55). */
    java.util.Map<UUID, Double> totalHoursByCard(UUID projectId);

    /** Every card's tokens, all time, summed over its entries that recorded any (card://JAVA-1588): a card
     *  no session reported is absent. */
    java.util.Map<UUID, com.javadaba.contexts.officium.domain.TokenUsage> tokensByCard(UUID projectId);

    /** Removes what an earlier report of this session imputed (JAVA-245): a report replaces it. */
    void deleteBySession(String sessionRef);

    /** Removes the run-imputed entries of {@code who} on these cards whose span overlaps
     *  {@code [from, to)}: a session report covers that time with its own entries. Entries imputed
     *  before spans were recorded carry none and stay. */
    void deleteRunEntriesOverlapping(Collection<UUID> cardIds, String who, Instant from, Instant to);

    /** Where the last session report of {@code who} on this card ended: a run that ends later imputes
     *  only what comes after it. */
    Optional<Instant> latestSessionEnd(UUID cardId, String who);
}
