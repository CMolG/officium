package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.ReviewRework;
import com.javadaba.contexts.officium.domain.ports.CardRepository;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * What {@code cards.next} hands out under the review rework cap (card://JAVA-1443): a review card whose streak is at
 * the cap is escalated to refine, so it is passed over and the next eligible card answers. Kept out of
 * {@code CardService} at its size ceiling.
 */
final class ReviewReworkPicker {

    private final CardRepository cards;
    private final CardViewAssembler viewAssembler;

    ReviewReworkPicker(CardRepository cards, CardViewAssembler viewAssembler) {
        this.cards = cards;
        this.viewAssembler = viewAssembler;
    }

    /** The next eligible card, skipping {@code skip} and every review card past the cap. */
    Optional<Card> next(UUID projectId, Set<UUID> skip, boolean beyondSprint) {
        Set<UUID> passed = new HashSet<>(skip);
        while (true) {
            Optional<Card> candidate = cards.nextEligible(projectId, passed, beyondSprint);
            if (candidate.isEmpty() || !ReviewRework.stuck(candidate.get().status(),
                    viewAssembler.returnsOf(candidate.get().id()))) {
                return candidate;
            }
            passed.add(candidate.get().id());
        }
    }
}
