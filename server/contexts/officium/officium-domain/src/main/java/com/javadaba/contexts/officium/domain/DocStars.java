package com.javadaba.contexts.officium.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Predicate;

/**
 * A person's starred documentation (JAVA-799, contract §8.21): an ordered list of what they keep at
 * the top of the sidebar, their own and nobody else's. A star holds an id, never a path, so a move or
 * a rename leaves it standing: a page by its {@code pageId}, a collection by the {@code nodeId} of its
 * layout row.
 */
public final class DocStars {

    /** What is starred: exactly one of the two ids is set. */
    public record Target(UUID pageId, UUID nodeId) {

        public Target {
            if ((pageId == null) == (nodeId == null)) {
                throw new IllegalArgumentException("A star is a page or a collection, never both or neither");
            }
        }

        public static Target page(UUID pageId) {
            return new Target(pageId, null);
        }

        public static Target collection(UUID nodeId) {
            return new Target(null, nodeId);
        }

        public String kind() {
            return pageId != null ? Kind.PAGE.wire() : Kind.COLLECTION.wire();
        }
    }

    public enum Kind {
        PAGE("page"), COLLECTION("collection");

        private final String wire;

        Kind(String wire) {
            this.wire = wire;
        }

        public String wire() {
            return wire;
        }

        /** {@code null} or empty is a page. */
        public static Kind fromWire(String value) {
            if (value == null || value.isEmpty() || value.equals(PAGE.wire)) {
                return PAGE;
            }
            if (value.equals(COLLECTION.wire)) {
                return COLLECTION;
            }
            throw OfficiumException.badRequest("invalid_star_kind", "`kind` is page or collection");
        }
    }

    private DocStars() {
    }

    /**
     * The order after starring {@code target}. A star already there keeps its place unless a
     * {@code position} says otherwise, a new one goes last, and a position is 0-based and clamped to
     * the list, so the order is always 0..n-1 afterwards.
     */
    public static List<Target> place(List<Target> order, Target target, Integer position) {
        return place(order, target, position, any -> true);
    }

    /**
     * As above, for a list that holds stars the person cannot see (a trashed page's): {@code position} is
     * an index among the {@code listed} stars other than {@code target}, the one a client counts. The
     * target goes before the listed star at that index, or last when there is none.
     */
    public static List<Target> place(List<Target> order, Target target, Integer position, Predicate<Target> listed) {
        List<Target> next = new ArrayList<>(order);
        int current = next.indexOf(target);
        if (current >= 0 && position == null) {
            return next;
        }
        if (current >= 0) {
            next.remove(current);
        }
        int at = next.size();
        int seen = 0;
        int wanted = position == null ? Integer.MAX_VALUE : Math.max(0, position);
        for (int i = 0; i < next.size(); i++) {
            if (listed.test(next.get(i)) && seen++ == wanted) {
                at = i;
                break;
            }
        }
        next.add(at, target);
        return next;
    }
}
