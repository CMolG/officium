package com.javadaba.contexts.officium.domain.jql;

import com.javadaba.contexts.officium.domain.Assignee;
import com.javadaba.contexts.officium.domain.Card;
import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Status;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.function.Predicate;

/**
 * Evaluates a parsed {@link JqlQuery} over {@link Card}s and sorts by its {@code ORDER BY} --
 * the Java twin of {@code jql.ts}'s {@code matchesJql}/{@code sortByJql} (contract JDB-270).
 *
 * <p>{@code blocked} and the send-backs come from {@link JqlCardFacts} rather than from stored fields: like the
 * flat filters' own {@code matchesBlocked} ({@code InMemoryCardSearch}), they aren't columns on {@link Card} --
 * {@code CardService} supplies them from {@code CardRepository#blockerStatuses} and the send-back log.
 */
public final class JqlEvaluator {

    private JqlEvaluator() {
    }

    public static boolean matches(Card card, JqlNode where, JqlContext ctx, Predicate<Card> blocked) {
        return matches(card, where, ctx, JqlCardFacts.blockedOnly(blocked));
    }

    public static boolean matches(Card card, JqlNode where, JqlContext ctx, JqlCardFacts facts) {
        return where == null || nodeMatches(card, where, ctx, facts);
    }

    /** Sorted copy. With no {@code ORDER BY}, most recently updated first -- what a search
     *  usually wants, same default as {@code jql.ts}'s {@code sortByJql}. */
    public static List<Card> sort(List<Card> cards, List<JqlOrder> orderBy) {
        List<JqlOrder> order = orderBy.isEmpty()
                ? List.of(new JqlOrder(JqlFieldId.UPDATED, JqlOrder.Dir.DESC))
                : orderBy;
        List<Card> copy = new ArrayList<>(cards);
        copy.sort((a, b) -> {
            for (JqlOrder o : order) {
                int cmp = compareSortValue(a, b, o.field());
                if (cmp != 0) {
                    return o.dir() == JqlOrder.Dir.ASC ? cmp : -cmp;
                }
            }
            return b.number() - a.number();
        });
        return copy;
    }

    private static boolean nodeMatches(Card card, JqlNode node, JqlContext ctx, JqlCardFacts facts) {
        if (node instanceof JqlNode.And and) {
            return and.items().stream().allMatch(n -> nodeMatches(card, n, ctx, facts));
        }
        if (node instanceof JqlNode.Or or) {
            return or.items().stream().anyMatch(n -> nodeMatches(card, n, ctx, facts));
        }
        if (node instanceof JqlNode.Not not) {
            return !nodeMatches(card, not.item(), ctx, facts);
        }
        return clauseMatches(card, (JqlNode.Clause) node, ctx, facts);
    }

    private static boolean clauseMatches(Card card, JqlNode.Clause node, JqlContext ctx, JqlCardFacts facts) {
        JqlFieldId field = node.field();
        JqlOp op = node.op();
        List<JqlValue> values = node.values();
        JqlField def = JqlFields.byId(field);

        if (op == JqlOp.IS) {
            return isEmpty(card, field, facts);
        }
        if (op == JqlOp.IS_NOT) {
            return !isEmpty(card, field, facts);
        }
        if (op == JqlOp.CONTAINS || op == JqlOp.NOT_CONTAINS) {
            boolean hit = def.kind() == JqlFieldKind.NAME
                    ? namesOf(card, field).stream().anyMatch(s -> containsWords(s, values.get(0).raw()))
                    : containsWords(textOf(card, field), values.get(0).raw());
            return op == JqlOp.CONTAINS ? hit : !hit;
        }

        JqlValue v = values.get(0);
        if (field == JqlFieldId.BLOCKED) {
            boolean cardBlocked = facts.blocked(card);
            boolean want = List.of("true", "yes").contains(JqlWords.norm(v.raw()));
            boolean eq = cardBlocked == want;
            return op == JqlOp.EQ ? eq : !eq;
        }
        if (field == JqlFieldId.REVIEW_RETURNS) {
            return compareOrdered(op, facts.returns(card).size(), parseNumber(v.raw()));
        }
        if (def.kind() == JqlFieldKind.DATE) {
            Instant at = field == JqlFieldId.CREATED ? card.createdAt() : card.updatedAt();
            JqlDates.Range range = JqlDates.parse(v, ctx.now());
            if (range == null) {
                return false;
            }
            // A bare day is a range: `= 2026-09-01` is "that day", `> 2026-09-01` is "after it".
            return switch (op) {
                case EQ -> !at.isBefore(range.from()) && at.isBefore(range.to());
                case NEQ -> at.isBefore(range.from()) || !at.isBefore(range.to());
                case GT -> !at.isBefore(range.to());
                case GTE -> !at.isBefore(range.from());
                case LT -> at.isBefore(range.from());
                default -> at.isBefore(range.to()); // LTE
            };
        }
        if (def.kind() == JqlFieldKind.NUMBER) {
            return compareOrdered(op, card.estimate(), parseNumber(v.raw()));
        }
        boolean ordered = op == JqlOp.GT || op == JqlOp.GTE || op == JqlOp.LT || op == JqlOp.LTE;
        if (ordered && def.kind() == JqlFieldKind.KEY) {
            return compareOrdered(op, card.number(), parseCardNumber(v.raw()));
        }
        if (ordered && def.kind() == JqlFieldKind.PRIORITY) {
            return compareOrdered(op, JqlWords.priorityRank(card.priority()),
                    JqlWords.priorityRank(JqlWords.PRIORITY_WORDS.get(JqlWords.norm(v.raw()))));
        }
        boolean any = values.stream().anyMatch(value -> equalsClause(card, field, value, ctx, facts));
        return op == JqlOp.EQ || op == JqlOp.IN ? any : !any;
    }

    private static List<String> namesOf(Card card, JqlFieldId field) {
        if (field == JqlFieldId.EPIC) {
            return List.of(nullToEmpty(card.epic()));
        }
        return card.assignees().stream().map(Assignee::name).toList();
    }

    private static String textOf(Card card, JqlFieldId field) {
        if (field == JqlFieldId.SUMMARY) {
            return card.title();
        }
        if (field == JqlFieldId.DESCRIPTION) {
            return nullToEmpty(card.description());
        }
        return String.join(" ", card.key(), card.title(), nullToEmpty(card.description()), nullToEmpty(card.epic()),
                String.join(" ", card.tags()));
    }

    /** {@code ~} is word containment, as in Jira: every word of the value appears, in any order. */
    private static boolean containsWords(String haystack, String needle) {
        String h = haystack.toLowerCase(Locale.ROOT);
        for (String word : needle.toLowerCase(Locale.ROOT).trim().split("\\s+")) {
            if (!word.isEmpty() && !h.contains(word)) {
                return false;
            }
        }
        return true;
    }

    private static boolean compareOrdered(JqlOp op, double a, double b) {
        return switch (op) {
            case GT -> a > b;
            case GTE -> a >= b;
            case LT -> a < b;
            case LTE -> a <= b;
            case NEQ -> a != b;
            default -> a == b; // EQ
        };
    }

    /** JS's {@code Number(raw)}: blank is {@code 0}. Values here were already validated at parse
     *  time ({@link JqlValues#invalid}), so a throw here would be a parser bug, not bad input. */
    private static double parseNumber(String raw) {
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? 0.0 : Double.parseDouble(trimmed);
    }

    /** {@code Number(v.raw.replace(/^.*-/, ""))}: the digits after the last dash, so both
     *  {@code key > 42} and {@code key > OFF-42} compare against the card's own number. */
    private static double parseCardNumber(String raw) {
        return parseNumber(raw.replaceFirst("^.*-", ""));
    }

    private static boolean equalsClause(Card card, JqlFieldId field, JqlValue v, JqlContext ctx,
            JqlCardFacts facts) {
        return switch (field) {
            case STATUS -> card.status() == JqlWords.STATUS_WORDS.get(JqlWords.norm(v.raw()));
            case PRIORITY -> card.priority() == JqlWords.PRIORITY_WORDS.get(JqlWords.norm(v.raw()));
            case EXECUTOR -> card.executor() == JqlWords.EXECUTOR_WORDS.get(JqlWords.norm(v.raw()));
            case CATEGORY -> card.category() == JqlWords.CATEGORY_WORDS.get(JqlWords.norm(v.raw()));
            case RUN_STATE -> card.runState().wire().equals(JqlWords.norm(v.raw()));
            case REJECTION -> card.rejection() != null
                    && card.rejection().reason() == JqlWords.REJECTION_WORDS.get(JqlWords.norm(v.raw()));
            case RETURN_REASON -> facts.returns(card).stream().anyMatch(
                    r -> r.reasons().contains(JqlWords.RETURN_REASON_WORDS.get(JqlWords.norm(v.raw()))));
            case KEY -> card.key().equalsIgnoreCase(v.raw());
            case ASSIGNEE -> v.fn() == JqlFunction.CURRENT_USER
                    ? ctx.currentUser() != null
                            && card.assignees().stream().anyMatch(a -> ctx.currentUser().equals(a.accountId()))
                    : card.assignees().stream().anyMatch(a -> a.name().equalsIgnoreCase(v.raw()));
            case EPIC -> card.epic() != null && card.epic().equalsIgnoreCase(v.raw());
            case LABELS -> card.tags().stream().anyMatch(t -> t.equalsIgnoreCase(v.raw()));
            default -> false;
        };
    }

    private static boolean isEmpty(Card card, JqlFieldId field, JqlCardFacts facts) {
        return switch (field) {
            case ASSIGNEE -> card.assignees().isEmpty();
            case EPIC -> card.epic() == null || card.epic().isEmpty();
            case LABELS -> card.tags().isEmpty();
            case DESCRIPTION -> card.description() == null || card.description().trim().isEmpty();
            case CATEGORY -> card.category() == null;
            case REJECTION -> card.rejection() == null;
            case RETURN_REASON -> facts.returns(card).isEmpty();
            default -> false;
        };
    }

    private static int compareSortValue(Card a, Card b, JqlFieldId field) {
        return switch (field) {
            case KEY -> Integer.compare(a.number(), b.number());
            case SUMMARY -> lower(a.title()).compareTo(lower(b.title()));
            case STATUS -> Integer.compare(statusOrder(a.status()), statusOrder(b.status()));
            case PRIORITY -> Integer.compare(JqlWords.priorityRank(a.priority()), JqlWords.priorityRank(b.priority()));
            case EXECUTOR -> a.executor().wire().compareTo(b.executor().wire());
            case CATEGORY -> Integer.compare(categoryOrder(a.category()), categoryOrder(b.category()));
            case ASSIGNEE -> firstAssigneeName(a).compareTo(firstAssigneeName(b));
            case EPIC -> lowerOrTilde(a.epic()).compareTo(lowerOrTilde(b.epic()));
            case CREATED -> a.createdAt().compareTo(b.createdAt());
            case UPDATED -> a.updatedAt().compareTo(b.updatedAt());
            case ESTIMATE -> Double.compare(a.estimate(), b.estimate());
            default -> 0;
        };
    }

    private static int statusOrder(Status status) {
        return status.ordinal();
    }

    private static int categoryOrder(Category category) {
        return category == null ? Category.values().length : category.ordinal();
    }

    private static String firstAssigneeName(Card card) {
        return card.assignees().isEmpty() ? "~" : lower(card.assignees().get(0).name());
    }

    private static String lowerOrTilde(String s) {
        return lower(s == null ? "~" : s);
    }

    private static String lower(String s) {
        return (s == null ? "" : s).toLowerCase(Locale.ROOT);
    }

    private static String nullToEmpty(String s) {
        return s == null ? "" : s;
    }
}
