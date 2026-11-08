package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocMove;
import com.javadaba.contexts.officium.domain.DocNode;

import java.util.List;
import java.util.UUID;

/** The write side of moving a documentation subtree (JAVA-792): one transaction, all or nothing. */
public interface DocMoveRepository {

    /**
     * Moves the pages, leaves a redirect from each old path, drops the redirects the new paths take, drops the
     * hidden layout rows at or under {@code to}, renames the layout rows in {@code nodeRenames} IN PLACE (a row
     * keeps its identity, so what refers to it follows the move), writes {@code nodesAfter} over them, and
     * recomputes the moved pages' links. Only pages that are not in the trash move, and not another member's
     * unpublished draft ({@code accountId} is the caller). {@code false} (nothing changed) when a path was taken.
     */
    boolean move(UUID projectId, UUID accountId, String to, List<DocMove.Moved> pages,
            List<DocMove.Moved> nodeRenames, List<DocNode> nodesAfter);
}
