package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The two lint rules that need the project's pages (JAVA-792, contract §8.14): {@code link.redirected}
 * for a reference to a path that moved, and {@code link.broken} for one that names nothing. Kept
 * beside {@link DocLint}, which only reads the text.
 */
public final class DocLinkLint {

    private DocLinkLint() {
    }

    /**
     * @param pages     paths of the project's pages (built-ins included)
     * @param shown     every path that exists as a page or as a prefix of one
     * @param redirects old path to the page's present path, for the references' paths
     */
    public static List<DocLint.Finding> lint(String pagePath, String body, Set<String> pages, Set<String> shown,
            Map<String, String> redirects) {
        List<DocLint.Finding> findings = new ArrayList<>();
        for (DocLinks.Ref ref : DocLinks.extract(pagePath, body)) {
            if (pages.contains(ref.path())) {
                continue;
            }
            String moved = movedTo(ref.path(), redirects);
            if (moved != null) {
                findings.add(new DocLint.Finding("link.redirected", ref.line(), "`doc://" + ref.path()
                        + "` moved to `doc://" + moved + "`: point the link there"));
            } else if (shown.contains(ref.path())) {
                findings.add(new DocLint.Finding("link.broken", ref.line(), "`doc://" + ref.path()
                        + "` is a folder with pages under it but no page of its own: link one of them"));
            } else {
                findings.add(new DocLint.Finding("link.broken", ref.line(),
                        "`doc://" + ref.path() + "` names no page"));
            }
        }
        return findings;
    }

    private static String movedTo(String path, Map<String, String> redirects) {
        return DocRedirects.resolve(path, redirects, current -> true).map(DocRedirects.Hit::path).orElse(null);
    }
}
