package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.CardRules;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.EpicCheckpoints;
import com.javadaba.contexts.officium.domain.EpicChildren;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.RunState;
import com.javadaba.contexts.officium.domain.Status;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * {@code cards.setCheckpoint} (card://JAVA-1876): the one write a sweep makes between checkpoints. Starting a
 * checkpoint moves its card to In progress; completing it comments the note (what was built and tested, the card's
 * finishing comment) and moves it to Review, where it waits for the epic's review. Both go through the ordinary move,
 * so every contract a card's move answers to still holds. The answer names the next checkpoint, so the session goes on
 * without reading the epic again.
 */
@ApplicationScoped
public class CheckpointService {

    private final CardService cards;
    private final CardCommentService comments;
    private final EpicSweeps sweeps;

    @Inject
    public CheckpointService(CardService cards, CardCommentService comments, EpicSweeps sweeps) {
        this.cards = cards;
        this.comments = comments;
        this.sweeps = sweeps;
    }

    /** {@code in_progress} or {@code completed}, the two moves a sweep makes. */
    public enum Target {
        IN_PROGRESS, COMPLETED;

        static Target fromWire(String wire) {
            return switch (wire == null ? "" : wire.strip()) {
                case "in_progress" -> IN_PROGRESS;
                case "completed" -> COMPLETED;
                default -> throw OfficiumException.badRequest("invalid_checkpoint_state",
                        "state is in_progress or completed");
            };
        }
    }

    /** The checkpoint as it now is, its epic's progress, and the checkpoint the sweep works next (null when none). */
    public record Answer(CheckpointView checkpoint, String epic, EpicCheckpoints.Progress progress,
            CheckpointView next) {
    }

    public Answer set(UUID accountId, UUID projectId, String cardKeyOrId, String state, String note, Actor actor) {
        Target target = Target.fromWire(state);
        CardView card = cards.get(accountId, projectId, cardKeyOrId);
        if (!sweeps.epicMode(projectId)) {
            throw OfficiumException.conflict("not_epic_mode", "Checkpoints are swept in a project that executes by "
                    + "epic (projects.setExecutionMode); here, move the card with cards.move");
        }
        String epic = epicOf(projectId, card);
        CardRules.requireRunnable(Executor.fromWire(card.executor()), RunState.RUNNING);
        Status status = Status.fromWire(card.status());
        CardView moved = switch (target) {
            case IN_PROGRESS -> status == Status.DOING ? card : start(accountId, projectId, card, status, actor);
            case COMPLETED -> complete(accountId, projectId, card, status, note, actor);
        };
        List<CheckpointView> checkpoints = sweeps.checkpoints(projectId, cards.get(accountId, projectId, epic));
        CheckpointView now = checkpoints.stream().filter(c -> c.id().equals(moved.id())).findFirst().orElseThrow();
        CheckpointView next = checkpoints.stream().filter(c -> c.state().equals("in_progress") && c.sweepable())
                .findFirst().or(() -> checkpoints.stream().filter(CheckpointView::sweepable).findFirst())
                .orElse(null);
        int completed = (int) checkpoints.stream().filter(c -> c.state().equals("completed")).count();
        return new Answer(now, epic, new EpicCheckpoints.Progress(completed, checkpoints.size()), next);
    }

    private CardView start(UUID accountId, UUID projectId, CardView card, Status status, Actor actor) {
        if (status != Status.TODO) {
            throw OfficiumException.conflict("checkpoint_not_pending", card.key() + " is " + status.wire()
                    + ": a checkpoint starts from To do (one in Refine is planned first)");
        }
        return cards.move(accountId, projectId, card.id(), card.version(), Status.DOING, Integer.MAX_VALUE, actor);
    }

    private CardView complete(UUID accountId, UUID projectId, CardView card, Status status, String note, Actor actor) {
        if (status != Status.DOING) {
            throw OfficiumException.conflict("checkpoint_not_started", card.key() + " is " + status.wire()
                    + ": complete a checkpoint that is in progress (state in_progress first)");
        }
        if (note == null || note.isBlank()) {
            throw OfficiumException.badRequest("note_required", "Completing a checkpoint takes a note: what was "
                    + "built, what was tested and what was not, the card's finishing comment");
        }
        comments.add(accountId, projectId, card.id().toString(), note.strip(), actor);
        CardView commented = cards.get(accountId, projectId, card.id().toString());
        return cards.move(accountId, projectId, card.id(), commented.version(), Status.REVIEW, Integer.MAX_VALUE,
                actor);
    }

    /** The key of the open epic {@code card} is a checkpoint of; refused for anything else. */
    private String epicOf(UUID projectId, CardView card) {
        EpicSweeps.Snapshot snapshot = sweeps.snapshot(projectId);
        Category category = card.category() == null ? null : Category.fromWire(card.category());
        if (category != Category.EPIC && category != Category.SPIKE) {
            for (Map.Entry<String, List<Card>> entry : EpicChildren.byEpic(snapshot.cards()).entrySet()) {
                boolean member = entry.getValue().stream().anyMatch(child -> child.id().equals(card.id()));
                boolean open = snapshot.cards().stream()
                        .anyMatch(c -> c.key().equals(entry.getKey()) && !c.status().closed());
                if (member && open) {
                    return entry.getKey();
                }
            }
        }
        throw OfficiumException.conflict("not_a_checkpoint", card.key() + " is no checkpoint: a checkpoint is a card "
                + "of an open epic, never the epic itself nor a spike, which is worked on its own");
    }
}
