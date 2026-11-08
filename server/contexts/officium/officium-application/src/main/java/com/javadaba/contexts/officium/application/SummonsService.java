package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.application.AccountSignals.SummonsSignal;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.Summons;
import com.javadaba.contexts.officium.domain.SummonsItem;
import com.javadaba.contexts.officium.domain.ports.SummonsInbox;
import com.javadaba.contexts.officium.domain.ports.SummonsRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * JAVA-1145: bothering the person enough to answer what their agents wait on. An agent calls
 * {@link #send} as often as it likes (every minute is fine): the server decides, in order, to close
 * the summons (nothing pending), to start a new round (a first one, a new item, a snooze that ended,
 * an agent asking again after {@link #ASKING} of silence, or 15 minutes unanswered with Officium
 * visible nowhere), or to do nothing. A round is pushed to the account's open tabs; the answer says
 * whether a device was open to receive it. A summons no agent keeps asking for stops showing.
 */
@ApplicationScoped
public class SummonsService {

    static final Duration SNOOZE = Duration.ofMinutes(15);
    static final Duration RESEND_AFTER = Duration.ofMinutes(15);
    /**
     * How long a summons stays on screen after its agent last asked. The autoloop's liaison asks every
     * minute; past this, nobody is waiting on the answer any more, so its toasts must not keep showing.
     */
    static final Duration ASKING = Duration.ofMinutes(5);
    /** The longest title an inbox entry carries. */
    static final int MAX_ENTRY_TITLE = 200;

    private final SummonsRepository summons;
    private final ProjectAccessGuard guard;
    private final PresenceService presence;
    private final ActivityPublisher activity;
    private final AccountSignals signals;
    private final SummonsInbox inbox;
    private final Clock clock;

    @Inject
    public SummonsService(SummonsRepository summons, ProjectAccessGuard guard, PresenceService presence,
            ActivityPublisher activity, AccountSignals signals, SummonsInbox inbox) {
        this(summons, guard, presence, activity, signals, inbox, Clock.systemUTC());
    }

    SummonsService(SummonsRepository summons, ProjectAccessGuard guard, PresenceService presence,
            ActivityPublisher activity, AccountSignals signals, SummonsInbox inbox, Clock clock) {
        this.summons = summons;
        this.guard = guard;
        this.presence = presence;
        this.activity = activity;
        this.signals = signals;
        this.inbox = inbox;
        this.clock = clock;
    }

    /** {@code state}: {@code closed}, {@code none}, {@code delivered}, {@code open} or {@code unchanged}. */
    public record SendResult(String state, SummonsView summons, String openPath) {
    }

    /** The round as the person and their agents see it. {@code canAnswer} is false for a viewer. */
    public record SummonsView(UUID id, UUID projectId, int round, List<SummonsItem> items, Instant summonedAt,
            String summonedBy, boolean delivered, Instant shownAt, Instant seenAt, Instant snoozedUntil,
            boolean canAnswer) {
    }

    public SendResult send(UUID accountId, UUID projectId, String machine, Actor actor) {
        guard.requireAccess(projectId, accountId);
        Instant now = Instant.now(clock);
        List<SummonsItem> pending = summons.pending(projectId, accountId);
        Optional<Summons> open = summons.findOpen(accountId, projectId);
        if (pending.isEmpty()) {
            open.ifPresent(round -> close(round, now, "nothing_pending"));
            return new SendResult(open.isPresent() ? "closed" : "none", null, null);
        }
        List<String> ids = pending.stream().map(SummonsItem::id).toList();
        if (open.isPresent() && !startsRound(open.get(), ids, now)) {
            Summons asked = open.get().asked(now);
            summons.save(asked);
            withdraw(asked, ids);
            return new SendResult("unchanged", view(asked, pending, accountId), null);
        }
        boolean delivered = presence.read(accountId).open();
        Summons round = open.map(s -> s.nextRound(ids, now, machine, delivered)).orElseGet(() -> new Summons(
                UUID.randomUUID(), projectId, accountId, ids, 1, now, machine, delivered, null, null, null, null,
                null, now));
        summons.save(round);
        open.ifPresent(previous -> withdraw(previous, ids));
        // A dedupe key replaces only an unread twin, so a read entry of a pending item would be left beside the new one.
        inbox.retract(accountId, ids);
        inbox.publish(accountId, pending.stream().map(item -> new SummonsInbox.Entry(item.id(), entryTitle(item),
                openPath(round))).toList());
        String text = "Summoned the person to answer, round " + round.round()
                + (delivered ? "" : " (Officium is open on none of their devices)");
        record(pending, projectId, actor, "card.summons", text, now);
        signals.publish(accountId, new SummonsSignal(round.id().toString(), projectId, round.round(), "round"));
        return new SendResult(delivered ? "delivered" : "open", view(round, pending, accountId),
                delivered ? null : openPath(round));
    }

    /**
     * The account's open summons across projects, each with what is still pending. A drained one is left
     * out, and so is one no agent has asked for within {@link #ASKING}: the summons is an agent asking now.
     */
    public List<SummonsView> current(UUID accountId) {
        Instant now = Instant.now(clock);
        List<SummonsView> shown = new ArrayList<>();
        for (Summons round : summons.openFor(accountId)) {
            if (!asking(round, now)) {
                withdraw(round, List.of());
                continue;
            }
            guard.requireAccess(round.projectId(), accountId);
            List<SummonsItem> pending = summons.pending(round.projectId(), accountId);
            withdraw(round, pending.stream().map(SummonsItem::id).toList());
            SummonsView view = view(round, pending, accountId);
            if (!view.items().isEmpty()) {
                shown.add(view);
            }
        }
        return shown;
    }

    public Optional<SummonsView> get(UUID accountId, UUID projectId) {
        guard.requireAccess(projectId, accountId);
        return summons.findOpen(accountId, projectId)
                .map(round -> view(round, summons.pending(projectId, accountId), accountId));
    }

    /** The summons was shown; {@code seen} when its tab was visible and focused. History on the first seen only. */
    public SummonsView shown(UUID accountId, UUID summonsId, boolean seen, Actor actor) {
        Summons round = require(accountId, summonsId);
        Instant now = Instant.now(clock);
        Summons next = round.shown(now, seen);
        summons.save(next);
        List<SummonsItem> pending = summons.pending(round.projectId(), accountId);
        if (next.seenAt() != null && round.seenAt() == null) {
            record(pending, round.projectId(), actor, "card.summons.seen",
                    "Saw the summons, round " + round.round(), now);
        }
        return view(next, pending, accountId);
    }

    public SummonsView snooze(UUID accountId, UUID summonsId, Actor actor) {
        Summons round = require(accountId, summonsId);
        Instant now = Instant.now(clock);
        Summons next = round.snoozed(now.plus(SNOOZE));
        summons.save(next);
        List<SummonsItem> pending = summons.pending(round.projectId(), accountId);
        record(pending, round.projectId(), actor, "card.summons.snoozed",
                "Asked to be reminded in 15 minutes, round " + round.round(), now);
        signals.publish(accountId, new SummonsSignal(round.id().toString(), round.projectId(), round.round(),
                "snoozed"));
        return view(next, pending, accountId);
    }

    private static boolean asking(Summons round, Instant now) {
        return round.askedAt().plus(ASKING).isAfter(now);
    }

    private boolean startsRound(Summons round, List<String> pendingIds, Instant now) {
        // An agent asking again after the summons went quiet is a new round, pushed to the open tabs.
        if (!round.itemIds().containsAll(pendingIds) || !asking(round, now)) {
            return true;
        }
        if (round.snoozedUntil() != null) {
            return !round.snoozedAt(now);
        }
        return !round.summonedAt().plus(RESEND_AFTER).isAfter(now) && !presence.read(round.accountId()).visible();
    }

    /**
     * Retracts from the inbox the items the round covered that are no longer pending. A read reconciles
     * the inbox this way too, so it is idempotent: the same body whether or not anything was withdrawn.
     */
    private void withdraw(Summons round, List<String> pendingIds) {
        List<String> left = round.itemIds().stream().filter(id -> !pendingIds.contains(id)).toList();
        if (!left.isEmpty()) {
            inbox.retract(round.accountId(), left);
        }
    }

    /** The inbox line for an item: its card's key and what it asks, cut to fit. */
    private static String entryTitle(SummonsItem item) {
        String title = item.cardKey() + " · " + Objects.toString(item.action() != null
                ? item.action()
                : item.cardTitle(), "");
        return title.length() > MAX_ENTRY_TITLE ? title.substring(0, MAX_ENTRY_TITLE) : title;
    }

    private void close(Summons round, Instant now, String reason) {
        withdraw(round, List.of());
        summons.save(round.closed(now, reason));
        signals.publish(round.accountId(), new SummonsSignal(round.id().toString(), round.projectId(), round.round(),
                "closed"));
    }

    private void record(List<SummonsItem> items, UUID projectId, Actor actor, String operation, String text,
            Instant now) {
        for (SummonsItem item : items) {
            activity.record(projectId, item.cardId(), item.cardKey(), actor, operation, text, now);
        }
    }

    private Summons require(UUID accountId, UUID summonsId) {
        return summons.find(summonsId).filter(s -> s.accountId().equals(accountId) && s.closedAt() == null)
                .orElseThrow(() -> OfficiumException.notFound("summons_not_found", "No open summons " + summonsId));
    }

    private SummonsView view(Summons round, List<SummonsItem> pending, UUID accountId) {
        boolean canAnswer;
        try {
            guard.requireAtLeast(round.projectId(), accountId, Role.EDITOR);
            canAnswer = true;
        } catch (OfficiumException viewer) {
            canAnswer = false;
        }
        return new SummonsView(round.id(), round.projectId(), round.round(), pending, round.summonedAt(),
                round.summonedBy(), round.delivered(), round.shownAt(), round.seenAt(), round.snoozedUntil(),
                canAnswer);
    }

    private static String openPath(Summons round) {
        return "/officium/app?view=summons&projectId=" + round.projectId() + "&summons=" + round.id();
    }
}
