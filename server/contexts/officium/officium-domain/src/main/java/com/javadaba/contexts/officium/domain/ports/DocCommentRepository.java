package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocComment;
import com.javadaba.contexts.officium.domain.DocCommentReaction;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * The comments of documentation pages (JAVA-797), keyed by page id so a move keeps them and a purge
 * deletes them. Every lookup is inside the page it names: another page's comment is simply not found.
 */
public interface DocCommentRepository {

    void insert(DocComment comment);

    Optional<DocComment> find(UUID pageId, UUID commentId);

    /** Oldest first. */
    List<DocComment> listByPage(UUID pageId);

    /** The comments of several pages at once, for the project-wide list. */
    List<DocComment> listByPages(Collection<UUID> pageIds);

    /** Text, resolution and tombstone; the quote and the author never change. */
    void update(DocComment comment);

    /** Deletes the comment and, for a root, its replies. */
    void delete(UUID pageId, UUID commentId);

    List<DocComment> repliesOf(UUID rootId);

    List<DocCommentReaction> reactionsOf(Collection<UUID> commentIds);

    /** {@code false} when that account already reacted with that emoji. */
    boolean addReaction(DocCommentReaction reaction);

    boolean removeReaction(UUID commentId, String emoji, UUID accountId);

    void clearReactions(UUID commentId);
}
