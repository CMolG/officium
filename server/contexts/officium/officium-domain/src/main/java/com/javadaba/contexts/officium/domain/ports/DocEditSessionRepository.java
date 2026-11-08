package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocEditSession;

import java.util.Optional;
import java.util.UUID;

/** The editing session each page's last checkpoint opened (JAVA-796); gone with the page. */
public interface DocEditSessionRepository {

    Optional<DocEditSession> find(UUID pageId);

    /** The session a checkpoint opened; {@code null} closes the page's session (a write named none). */
    void save(UUID pageId, DocEditSession session);
}
