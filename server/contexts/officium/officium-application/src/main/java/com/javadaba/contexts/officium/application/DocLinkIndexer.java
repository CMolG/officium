package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DocLinks;
import com.javadaba.contexts.officium.domain.ports.DocLinkRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Indexes the links of pages written before the index existed, or by a release that did not write it
 * (JAVA-792, contract §8.20). Page writes keep the index current themselves; this is the backfill and
 * the net for a rolling deploy.
 */
@ApplicationScoped
public class DocLinkIndexer {

    static final int BATCH = 200;

    private final DocLinkRepository links;

    @Inject
    public DocLinkIndexer(DocLinkRepository links) {
        this.links = links;
    }

    /** One batch; returns how many pages it indexed (a page that changed meanwhile is left for the next). */
    public int run() {
        int indexed = 0;
        for (DocLinkRepository.Unindexed page : links.unindexed(BATCH)) {
            if (links.index(page.id(), page.version(), page.projectId(), DocLinks.extract(page.path(), page.body()))) {
                indexed++;
            }
        }
        return indexed;
    }
}
