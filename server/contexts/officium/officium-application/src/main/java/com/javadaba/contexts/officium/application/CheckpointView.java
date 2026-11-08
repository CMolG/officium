package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.EpicCheckpoints;

import java.util.List;
import java.util.UUID;

/**
 * One checkpoint of an epic on the wire (card://JAVA-1876): the card, where it is in the sweep, and the mods its
 * action phase is built under. {@code state} is {@code pending}, {@code in_progress} or {@code completed};
 * {@code sweepable} is what a sweep's implementer works ({@link EpicCheckpoints.Checkpoint#sweepable()}).
 *
 * <p>{@code blocked} is what holds the checkpoint back from the way the project works, the board's "Blocked" note: in
 * a project that executes by epic, work outside the sweep ({@code !ready}), since a sibling completed in the sweep is
 * on the epic's branch; card by card, any unfinished blocker. card://JAVA-2001: served raw in epic mode, it read
 * {@code blocked: true} on the very checkpoint a sweep named {@code next}, and every session refused it.
 */
public record CheckpointView(UUID id, String key, String title, String status, String state, String category,
        String executor, boolean planned, boolean blocked, boolean ready, boolean verification, boolean sweepable,
        List<String> mods) {

    static CheckpointView of(EpicCheckpoints.Checkpoint checkpoint, List<String> mods, boolean epicMode) {
        var card = checkpoint.card();
        return new CheckpointView(card.id(), card.key(), card.title(), card.status().wire(),
                checkpoint.state().wire(), card.category() == null ? null : card.category().wire(),
                card.executor().wire(), checkpoint.planned(),
                epicMode ? !checkpoint.ready() : checkpoint.blocked(), checkpoint.ready(),
                checkpoint.verification(), checkpoint.sweepable(), mods);
    }
}
