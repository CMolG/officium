package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;

/**
 * Resolves an old documentation path to where its page lives now (JAVA-792, contract §8.20). A
 * redirect row holds the page it followed, so the row answers the page's current path and a chain
 * of moves needs nothing rewritten. A prefix row answers for anything under the old path, the
 * {@code _files} of a moved page included.
 */
public final class DocRedirects {

    /** Where {@code redirectedFrom} lives now. */
    public record Hit(String path, String redirectedFrom) {
    }

    private DocRedirects() {
    }

    /** {@code path} and each of its ancestors, longest first: the redirect rows worth asking for. */
    public static List<String> candidates(String path) {
        List<String> candidates = new ArrayList<>();
        String current = path;
        while (true) {
            candidates.add(current);
            int slash = current.lastIndexOf('/');
            if (slash < 0) {
                return candidates;
            }
            current = current.substring(0, slash);
        }
    }

    /**
     * The longest redirect that is {@code path} or a segment prefix of it. {@code currentPathOf}
     * maps a redirect's old path to its page's present one; {@code readable} says whether the caller
     * may see that page, and an unreadable one answers nothing.
     */
    public static Optional<Hit> resolve(String path, Map<String, String> currentPathOf, Predicate<String> readable) {
        for (String candidate : candidates(path)) {
            String current = currentPathOf.get(candidate);
            if (current == null) {
                continue;
            }
            String resolved = current + path.substring(candidate.length());
            return readable.test(resolved) ? Optional.of(new Hit(resolved, path)) : Optional.empty();
        }
        return Optional.empty();
    }
}
