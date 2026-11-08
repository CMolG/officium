package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;

/**
 * Plans the move of a documentation subtree (JAVA-792, contract §8.20): which pages go where, and
 * whether the move is allowed at all. Pure, so the REST and MCP adapters can't disagree on it.
 */
public final class DocMove {

    /** One page's path before and after the move. */
    public record Moved(String from, String to) {
    }

    private DocMove() {
    }

    /**
     * The moved pages: the one at {@code path}, if any, and every page under it. {@code path} and
     * {@code to} are normalized paths; the plan refuses what no move can do.
     */
    public static List<Moved> plan(String path, String to, List<String> pagePaths) {
        requireMovable(path, to);
        List<Moved> moved = new ArrayList<>();
        for (String page : pagePaths) {
            if (page.equals(path) || page.startsWith(path + "/")) {
                String target = map(page, path, to);
                requireValid(target);
                moved.add(new Moved(page, target));
            }
        }
        return moved;
    }

    /** {@code candidate}, a path at or under {@code from}, as it reads once {@code from} became {@code to}. */
    public static String map(String candidate, String from, String to) {
        return candidate.equals(from) ? to : to + candidate.substring(from.length());
    }

    public static boolean isAtOrUnder(String candidate, String ancestor) {
        return candidate.equals(ancestor) || candidate.startsWith(ancestor + "/");
    }

    private static void requireMovable(String path, String to) {
        if (DocPage.isBuiltin(path)) {
            throw OfficiumException.forbidden("builtin_doc_read_only",
                    "\"" + path + "\" is one of Officium's own pages: they can't be moved");
        }
        if (DocPage.isBuiltin(to)) {
            throw OfficiumException.forbidden("builtin_doc_read_only",
                    "\"" + to + "\" is where Officium's own pages live: move the page somewhere else");
        }
        if (path.equals(to)) {
            throw OfficiumException.badRequest("doc_move_same_path", "\"" + path + "\" is already there");
        }
        if (to.startsWith(path + "/")) {
            throw OfficiumException.badRequest("doc_move_into_itself",
                    "\"" + path + "\" can't move inside itself, to \"" + to + "\"");
        }
        requireValid(to);
    }

    private static void requireValid(String target) {
        String reserved = DocPage.reservedFor(target);
        if (reserved != null) {
            throw OfficiumException.badRequest("reserved_doc_path",
                    "\"" + target + "\" is where " + reserved + " lives: give the page another path");
        }
        if (DocNode.depth(target) > DocPage.MAX_DEPTH || target.length() > DocPage.MAX_PATH_LENGTH) {
            throw OfficiumException.badRequest("invalid_doc_path", "\"" + target + "\" would pass "
                    + DocPage.MAX_DEPTH + " segments or " + DocPage.MAX_PATH_LENGTH + " characters");
        }
    }
}
