package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardTimeEntry;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.StorageUsage;
import com.javadaba.contexts.officium.domain.ports.CardRepository;
import com.javadaba.contexts.officium.domain.ports.CardTimeEntryRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@ApplicationScoped
public class CardTimeService {

    private final CardTimeEntryRepository entries;
    private final CardRepository cards;
    private final ProjectAccessGuard guard;
    private final CardService cardService;
    private final ActivityPublisher activity;
    private final StorageQuotaService quota;
    private final Clock clock;

    @Inject
    public CardTimeService(CardTimeEntryRepository entries, CardRepository cards, ProjectAccessGuard guard,
            CardService cardService, ActivityPublisher activity, StorageQuotaService quota) {
        this(entries, cards, guard, cardService, activity, quota, Clock.systemUTC());
    }

    CardTimeService(CardTimeEntryRepository entries, CardRepository cards, ProjectAccessGuard guard,
            CardService cardService, ActivityPublisher activity, StorageQuotaService quota, Clock clock) {
        this.entries = entries;
        this.cards = cards;
        this.guard = guard;
        this.cardService = cardService;
        this.activity = activity;
        this.quota = quota;
        this.clock = clock;
    }

    public List<CardTimeEntry> list(UUID accountId, UUID projectId, String keyOrId) {
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        return entries.listByCard(cardId);
    }

    public CardTimeEntry add(UUID accountId, UUID projectId, String keyOrId, LocalDate date, double hours,
            String who, String note, Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        String person = who == null || who.isBlank() ? actor.name() : who;
        quota.requireRoom(access.project(), StorageUsage.bytesOf(person, note));
        CardTimeEntry saved = entries.insert(new CardTimeEntry(UUID.randomUUID(), cardId, date, hours, person,
                actor.kind() == com.javadaba.contexts.officium.domain.ActorKind.PERSON ? actor.accountId() : null,
                note, Instant.now(clock), com.javadaba.contexts.officium.domain.TimeSource.MANUAL));
        touchCard(projectId, cardId, actor);
        Card card = cards.findById(projectId, cardId).orElse(null);
        activity.record(projectId, cardId, card == null ? null : card.key(), actor, "card.time",
                hours + "h logged by " + person, saved.createdAt());
        activity.publish("card.time", projectId, cardId, card == null ? null : card.key(), null, actor,
                saved.createdAt());
        return saved;
    }

    public CardTimeEntry edit(UUID accountId, UUID projectId, String keyOrId, UUID entryId, LocalDate date,
            Double hours, String who, String note, Actor actor) {
        var access = guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        CardTimeEntry existing = entries.findById(cardId, entryId)
                .orElseThrow(() -> OfficiumException.notFound("time_entry_not_found", "No such time entry"));
        CardTimeEntry updated = existing.edited(date != null ? date : existing.date(),
                hours != null ? hours : existing.hours(), who != null ? who : existing.who(),
                note != null ? note : existing.note());
        quota.requireRoom(access.project(), StorageUsage.bytesOf(updated.who(), updated.note())
                - StorageUsage.bytesOf(existing.who(), existing.note()));
        CardTimeEntry saved = entries.update(updated);
        touchCard(projectId, cardId, actor);
        return saved;
    }

    public void delete(UUID accountId, UUID projectId, String keyOrId, UUID entryId, Actor actor) {
        guard.requireAtLeast(projectId, accountId, Role.EDITOR);
        UUID cardId = cardService.resolveCardId(accountId, projectId, keyOrId);
        entries.findById(cardId, entryId)
                .orElseThrow(() -> OfficiumException.notFound("time_entry_not_found", "No such time entry"));
        entries.delete(cardId, entryId);
        touchCard(projectId, cardId, actor);
    }

    public TimesheetReport timesheet(UUID accountId, UUID projectId, LocalDate from, LocalDate to, String person) {
        guard.requireAtLeast(projectId, accountId, Role.VIEWER);
        List<CardTimeEntryRepository.KeyedTimeEntry> raw = entries.listKeyedByProjectAndRange(projectId, from, to,
                person);
        List<TimeEntryView> views = raw.stream().map(TimeEntryView::of).toList();
        Map<String, Double> byPerson = new LinkedHashMap<>();
        for (CardTimeEntryRepository.KeyedTimeEntry keyed : raw) {
            byPerson.merge(keyed.entry().who(), keyed.entry().hours(), Double::sum);
        }
        List<TimesheetReport.Total> totals = byPerson.entrySet().stream()
                .map(e -> new TimesheetReport.Total(e.getKey(), e.getValue()))
                .toList();
        return new TimesheetReport(from, to, views, totals);
    }

    private void touchCard(UUID projectId, UUID cardId, Actor actor) {
        Card current = cards.findById(projectId, cardId).orElse(null);
        if (current == null) {
            return;
        }
        // Logged effort is not something the card SAYS: never a human edit.
        Card touched = current.touched(actor, Instant.now(clock));
        cards.updateIfVersion(touched, current.version());
        cardService.reindex(touched);
    }
}
