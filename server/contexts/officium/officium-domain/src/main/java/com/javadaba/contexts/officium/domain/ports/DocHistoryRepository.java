package com.javadaba.contexts.officium.domain.ports;

import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocRevision;
import com.javadaba.contexts.officium.domain.DocSettings;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** The kept versions of a project's pages and its documentation settings (JAVA-794). */
public interface DocHistoryRepository {

    /** The kept revisions of a page, newest version first. */
    List<DocRevision> revisions(UUID pageId);

    Optional<DocRevision> revision(UUID pageId, UUID revisionId);

    /**
     * Updates the page if it is still at {@code expectedVersion}, then keeps the history the policy
     * decides, in one transaction. {@code historyRoom} is the bytes the history may add; when the
     * retiring version does not fit, the page still saves without it.
     */
    SaveResult updateKeepingHistory(DocPage edited, int expectedVersion, long historyRoom, int historyDays,
            Instant now);

    /**
     * Deletes a revision for good; {@code false} when it was not there. In the same transaction the
     * policy runs again over what is left, so deleting the heaviest flags the next heaviest at once.
     */
    boolean deleteRevision(UUID pageId, UUID revisionId, int historyDays, Instant now);

    DocSettings settings(UUID projectId);

    /** Stores the settings if still at {@code expectedVersion}, and drops what the new window expired. */
    boolean saveSettings(DocSettings settings, int expectedVersion, Instant now);

    /** Deletes every non-heaviest revision past its project's window; how many went. */
    int sweepExpired(Instant now);

    /** {@code updated} is false when the version check lost; {@code revisionId} is what the replaced version became. */
    record SaveResult(boolean updated, boolean historyKept, UUID revisionId) {
    }
}
