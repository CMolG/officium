package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.javadaba.contexts.officium.domain.DocSearchQuery;
import com.javadaba.contexts.officium.domain.DocSnippet;
import com.javadaba.contexts.officium.domain.ports.DocSearchPort;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.UUID;

/**
 * Ranked full-text search over a project's documentation and Officium's own pages (JAVA-800,
 * contract §8.7). Officium's pages are filtered here with the same rules the database applies to a
 * project's, then both go through one statement so one ranking covers them.
 */
@ApplicationScoped
public class DocSearchService {

    private final DocSearchPort search;
    private final BuiltinDocs builtins;
    private final ProjectAccessGuard guard;

    public DocSearchService(DocSearchPort search, BuiltinDocs builtins, ProjectAccessGuard guard) {
        this.search = search;
        this.builtins = builtins;
        this.guard = guard;
    }

    /** A result: the page summary, flattened, plus the excerpt as parts (never HTML). */
    public record Result(@JsonUnwrapped DocPageView.Summary page, List<DocSnippet.Part> snippet) {
    }

    public List<Result> search(UUID accountId, UUID projectId, DocSearchQuery query) {
        guard.requireAccess(projectId, accountId);
        return search.search(projectId, accountId, query, extras(query)).stream()
                .map(hit -> new Result(DocPageView.Summary.of(hit.page()), hit.snippet())).toList();
    }

    /** Officium's pages are published, never archived and written by Officium: the filters follow from that. */
    private List<DocSearchPort.Extra> extras(DocSearchQuery query) {
        if (query.state() != null && !query.state().equals("published")) {
            return List.of();
        }
        return builtins.all().stream()
                .filter(page -> query.collection() == null || page.path().equals(query.collection())
                        || page.path().startsWith(query.collection() + "/"))
                .filter(page -> query.author() == null || query.author().equals(BuiltinDocs.AUTHOR.accountId()))
                .filter(page -> query.updatedAfter() == null || !page.updatedAt().isBefore(query.updatedAfter()))
                .filter(page -> query.updatedBefore() == null || !page.updatedAt().isAfter(query.updatedBefore()))
                .map(page -> new DocSearchPort.Extra(page.id(), page.path(), page.title(), page.body(),
                        page.updatedAt(), BuiltinDocs.AUTHOR))
                .toList();
    }
}
