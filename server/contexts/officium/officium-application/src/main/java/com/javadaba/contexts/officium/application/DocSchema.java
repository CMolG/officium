package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DocLint;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.OfficiumException;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Officium's documentation page schema (JAVA-781): part of the documentation contract, served to
 * agents by {@code docs.schema} and checked by {@code docs.lint}. It is a resource shipped with the
 * API, never a documentation page, so no {@code docs.list} shows it (user decision, 2026-10-02).
 *
 * <p>Read when the bean is first used, never in a static initializer (invariant 8).
 */
@ApplicationScoped
public class DocSchema {

    static final String RESOURCE = "javadaba/officium/doc-page-schema.md";

    private final String markdown;
    private final DocService docs;
    private final DocRedirectResolver links;
    private final ProjectAccessGuard guard;

    @Inject
    public DocSchema(DocService docs, DocRedirectResolver links, ProjectAccessGuard guard) {
        this.links = links;
        this.guard = guard;
        this.docs = docs;
        try (InputStream in = DocSchema.class.getClassLoader().getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("The page schema is missing from the classpath: " + RESOURCE);
            }
            this.markdown = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException("Unable to read " + RESOURCE, ex);
        }
    }

    /** {@code docs.schema}: the schema itself, as Markdown. */
    public Schema schema() {
        return new Schema(markdown);
    }

    /**
     * {@code docs.lint}: a {@code body} as sent, or else the page at {@code path} of a project the
     * caller can read.
     */
    public Lint lint(UUID accountId, UUID projectId, String path, String body) {
        if (body != null) {
            List<DocLint.Finding> findings = new ArrayList<>(DocLint.lint(body));
            if (projectId != null) {
                guard.requireAccess(projectId, accountId);
                String own = path == null || path.isBlank() ? "pages/draft" : DocPage.normalizePath(path);
                findings.addAll(links.linkFindings(projectId, own, body));
            }
            return new Lint(null, findings);
        }
        if (projectId == null || path == null || path.isBlank()) {
            throw OfficiumException.badRequest("body_or_page_required",
                    "Send the Markdown to check as `body`, or a page as `projectId` and `path`");
        }
        DocPageView page = docs.get(accountId, projectId, DocPage.normalizePath(path));
        List<DocLint.Finding> findings = new ArrayList<>(DocLint.lint(page.body()));
        findings.addAll(links.linkFindings(projectId, page.path(), page.body()));
        return new Lint(page.path(), findings);
    }

    public record Schema(String markdown) {
    }

    /** {@code path} is the page checked, or null for a body sent as is. */
    public record Lint(String path, List<DocLint.Finding> findings) {
    }
}
