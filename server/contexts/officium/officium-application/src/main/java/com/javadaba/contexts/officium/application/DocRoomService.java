package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.Role;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

/**
 * The live rooms of documentation pages (JAVA-803, ADR 0024, contract §8.24). It owns the in-memory
 * {@link DocRoomBoard} and answers one question for the socket: may this account join this page's
 * room, and as what. Everything a room says is the board's.
 */
@ApplicationScoped
public class DocRoomService {

    private final DocPageRepository docs;
    private final ProjectAccessGuard guard;
    private final DocRoomBoard board;

    @Inject
    public DocRoomService(DocPageRepository docs, ProjectAccessGuard guard) {
        this.docs = docs;
        this.guard = guard;
        this.board = new DocRoomBoard(Clock.systemUTC());
    }

    /** Whether the caller joins as an editor; a viewer joins as an observer. */
    public boolean mayEdit(UUID accountId, UUID projectId, UUID pageId) {
        Role role = guard.requireAccess(projectId, accountId).role();
        DocPage page = docs.findById(projectId, pageId).filter(p -> p.visibleTo(accountId))
                .orElseThrow(() -> OfficiumException.notFound("doc_not_found", "No such page"));
        if (DocPage.isBuiltin(page.path())) {
            throw OfficiumException.notFound("doc_not_found", "No such page");
        }
        return role.atLeast(Role.EDITOR) && !page.lifecycle().archived();
    }

    public DocRoomBoard board() {
        return board;
    }

    /** The co-authors the room names for a save made under {@code epoch}; empty outside a live room. */
    public List<Actor> coAuthors(UUID projectId, String epoch) {
        return epoch == null ? List.of() : board.coAuthors(projectId, epoch);
    }

    /** A save recorded these co-authors: the room starts counting again. */
    public void saved(UUID projectId, String epoch) {
        if (epoch != null) {
            board.saved(projectId, epoch);
        }
    }
}
