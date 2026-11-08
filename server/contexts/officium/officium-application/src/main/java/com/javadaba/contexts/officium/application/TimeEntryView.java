package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.TokenUsage;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository.KeyedTimeEntry;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Contract §2 {@code TimeEntry}. The token counts are null where nothing measured them: a person's
 *  entry, or time imputed from a run (JAVA-245). {@code profileId}: the work profile a session ran under
 *  (card://JAVA-1527). */
public record TimeEntryView(UUID id, UUID cardId, String cardKey, LocalDate date, double hours,
        String who, UUID accountId, String note, Instant createdAt, String source, String concept, String model,
        String effort, Long tokensIn, Long cachedTokensIn, Long reasoningTokens, Long tokensOut, Instant startedAt,
        Instant endedAt,
        String subagent, String profileId, String cardTitle, String cardEpic, String cardStatus) {

    public static TimeEntryView of(CardTimeEntry entry, String cardKey) {
        return of(entry, cardKey, null, null, null);
    }

    /** The timesheet's entries alone carry the card's title, epic and status (JAVA-1661). */
    public static TimeEntryView of(KeyedTimeEntry keyed) {
        return of(keyed.entry(), keyed.cardKey(), keyed.cardTitle(), keyed.cardEpic(), keyed.cardStatus());
    }

    private static TimeEntryView of(CardTimeEntry entry, String cardKey, String cardTitle, String cardEpic,
            String cardStatus) {
        TokenUsage tokens = entry.tokens();
        return new TimeEntryView(entry.id(), entry.cardId(), cardKey, entry.date(), entry.hours(),
                entry.who(), entry.accountId(), entry.note(), entry.createdAt(), entry.source().wire(),
                entry.concept().wire(), entry.model(), entry.effort(), tokens == null ? null : tokens.tokensIn(),
                tokens == null ? null : tokens.cachedTokensIn(), tokens == null ? null : tokens.reasoningTokens(),
                tokens == null ? null : tokens.tokensOut(), entry.startedAt(), entry.endedAt(), entry.subagent(),
                entry.profileId(), cardTitle, cardEpic, cardStatus);
    }
}
