package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.DocLint;
import com.javadaba.contexts.officium.domain.DocLinkLint;
import com.javadaba.contexts.officium.domain.DocLinks;
import com.javadaba.contexts.officium.domain.DocPage;
import com.javadaba.contexts.officium.domain.DocRedirects;
import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.ports.DocPageRepository;
import com.javadaba.contexts.officium.domain.ports.DocRedirectRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Where a moved page lives now, and what a page's links find (JAVA-792, contract §8.20). Reads
 * follow a redirect through here; so does the link lint, which is the one lint that needs the
 * project's pages.
 */
@ApplicationScoped
public class DocRedirectResolver {

    /** The page an old path leads to, and the path that was asked for. */
    public record Followed(DocPage page, String redirectedFrom) {
    }

    private final DocPageRepository docs;
    private final DocRedirectRepository redirects;
    private final BuiltinDocs builtins;

    @Inject
    public DocRedirectResolver(DocPageRepository docs, DocRedirectRepository redirects, BuiltinDocs builtins) {
        this.docs = docs;
        this.redirects = redirects;
        this.builtins = builtins;
    }

    /** The page {@code path} moved to, if a redirect leads from it (or from a prefix of it) to a page. */
    public Optional<Followed> follow(UUID projectId, String path) {
        if (DocPage.isBuiltin(path)) {
            return Optional.empty();
        }
        Map<String, String> rows = redirects.currentPaths(projectId, DocRedirects.candidates(path));
        return DocRedirects.resolve(path, rows, current -> !DocPage.isBuiltin(current))
                .flatMap(hit -> docs.find(projectId, hit.path()).map(page -> new Followed(page, hit.redirectedFrom())));
    }

    /** "No such page", naming where it went when a redirect knows. */
    public OfficiumException notFound(UUID projectId, String path) {
        return follow(projectId, path)
                .map(followed -> OfficiumException.notFound("doc_not_found",
                        "No such page: \"" + path + "\" moved to \"" + followed.page().path() + "\""))
                .orElseGet(() -> OfficiumException.notFound("doc_not_found", "No such page"));
    }

    /** {@code link.redirected} and {@code link.broken} for the page's references (contract §8.14). */
    public List<DocLint.Finding> linkFindings(UUID projectId, String pagePath, String body) {
        List<DocLinks.Ref> refs = DocLinks.extract(pagePath, body);
        if (refs.isEmpty()) {
            return List.of();
        }
        Set<String> wanted = new HashSet<>();
        refs.forEach(ref -> wanted.add(ref.path()));
        Set<String> pages = new HashSet<>(docs.pathsAmong(projectId, wanted));
        Set<String> shown = new HashSet<>(pages);
        shown.addAll(docs.parentsAmong(projectId, wanted));
        for (String path : wanted) {
            if (builtins.find(path).isPresent() || DocPage.reservedFor(path) != null) {
                pages.add(path);
            } else if (builtins.all().stream().anyMatch(page -> page.path().startsWith(path + "/"))) {
                shown.add(path);
            }
        }
        Set<String> unresolved = new HashSet<>(wanted);
        unresolved.removeAll(pages);
        Set<String> candidates = new HashSet<>();
        unresolved.forEach(path -> candidates.addAll(DocRedirects.candidates(path)));
        Map<String, String> rows = redirects.currentPaths(projectId, candidates);
        shown.addAll(pages);
        return DocLinkLint.lint(pagePath, body, pages, shown, rows);
    }
}
