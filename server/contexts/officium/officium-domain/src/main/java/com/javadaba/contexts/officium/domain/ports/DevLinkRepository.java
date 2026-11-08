package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.github.DevLink;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** A card's GitHub activity (JAVA-375), unique per {@code (cardId, kind, repo, ref)}. */
public interface DevLinkRepository {

    Optional<DevLink> find(UUID cardId, DevLink.Kind kind, String repo, String ref);

    /** Inserts the link, or updates url, title, author, state and updatedAt of the one it matches. */
    void upsert(DevLink link);

    /** Newest activity first. */
    List<DevLink> listByCard(UUID cardId);

    /** Closes every card's link to a branch that was deleted; answers how many there were. */
    int closeBranch(UUID projectId, String repo, String branch, Instant at);

    /**
     * Marks every card's open link to a branch whose pull request merged; answers those cards' ids (JAVA-1880). A
     * squash merge keeps none of the branch's commits on the default branch, so this link is what says they arrived.
     */
    List<UUID> mergeBranch(UUID projectId, String repo, String branch, Instant at);
}
