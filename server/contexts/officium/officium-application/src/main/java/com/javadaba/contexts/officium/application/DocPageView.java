package com.javadaba.contexts.officium.application;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.javadaba.contexts.officium.domain.Actor;
import com.javadaba.contexts.officium.domain.DocLifecycle;
import com.javadaba.contexts.officium.domain.DocLint;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocPageSummary;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Wire shape of {@link DocPage} (contract §8.7). {@code builtin}: one of Officium's own pages, read-only
 *  in every project (JAVA-783, §8.15); no project page can have a path under that prefix. {@code template}:
 *  a template (JAVA-801), out of the tree, copied into new pages. */
public record DocPageView(UUID id, UUID projectId, String path, String title, String body, int version,
        ActorJson createdBy, ActorJson updatedBy, Instant createdAt, Instant updatedAt, boolean builtin,
        Instant publishedAt, Instant archivedAt, ActorJson archivedBy, List<ActorJson> coAuthors,
        String redirectedFrom, boolean template) {

    /** {@code publishedAt} null is an unpublished draft (JAVA-793); {@code archivedAt}/{@code archivedBy} say who
     *  archived the page and when, null on a page in the tree. */
    public static DocPageView of(DocPage page) {
        DocLifecycle life = page.lifecycle();
        return new DocPageView(page.id(), page.projectId(), page.path(), page.title(), page.body(), page.version(),
                ActorJson.of(page.createdBy()), ActorJson.of(page.updatedBy()), page.createdAt(), page.updatedAt(),
                DocPage.isBuiltin(page.path()), life.publishedAt(), life.archivedAt(), actor(life.archivedBy()),
                page.coAuthors().stream().map(ActorJson::of).toList(), null, page.template());
    }

    /** The page as reached through a redirect: {@code redirectedFrom} is the old path that was asked for. */
    public DocPageView withRedirectedFrom(String oldPath) {
        return new DocPageView(id, projectId, path, title, body, version, createdBy, updatedBy, createdAt,
                updatedAt, builtin, publishedAt, archivedAt, archivedBy, coAuthors, oldPath, template);
    }

    private static ActorJson actor(Actor actor) {
        return actor == null ? null : ActorJson.of(actor);
    }

    /**
     * A page just written, with what the page schema's lint found in it (JAVA-781), flattened so it
     * reads exactly like the page plus {@code findings}. They warn: the page is saved whatever they say.
     */
    public record Linted(@JsonUnwrapped DocPageView page, List<DocLint.Finding> findings, boolean historyKept,
            UUID revisionId) {
    }

    /** A page in a list or a search: everything but the body. {@code published} false is the caller's own
     *  unpublished draft; the archive and the trash lists fill in who and when (JAVA-793). */
    public record Summary(UUID id, String path, String title, int version, ActorJson updatedBy, Instant updatedAt,
            boolean builtin, boolean published, Instant archivedAt, ActorJson archivedBy, Instant deletedAt,
            ActorJson deletedBy, Instant purgeAfter, boolean template) {

        public static Summary of(DocPageSummary page) {
            DocLifecycle life = page.lifecycle();
            return new Summary(page.id(), page.path(), page.title(), page.version(), ActorJson.of(page.updatedBy()),
                    page.updatedAt(), DocPage.isBuiltin(page.path()), life.published(), life.archivedAt(),
                    actor(life.archivedBy()), life.deletedAt(), actor(life.deletedBy()), life.purgeAfter(),
                    page.template());
        }

        public static Summary of(BuiltinDocs.Page page) {
            return new Summary(page.id(), page.path(), page.title(), 1, ActorJson.of(BuiltinDocs.AUTHOR),
                    page.updatedAt(), true, true, null, null, null, null, null, false);
        }
    }
}
