package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import javax.sql.DataSource;
import java.util.Optional;
import java.util.UUID;

/**
 * The SQL of a precedence rule's rank (ADR 0032, JAVA-1686). {@code cards.next} orders by {@link #rank}, and the
 * parity test reads the same text, so the two cannot drift apart. The project's rules are bound once, as the first
 * parameter of the statement, and expanded once by the materialized {@code ranking} CTE that {@link #withRanking}
 * puts in front: each card then compares its own tokens with the rule's arrays, instead of re-reading the JSON per
 * card (JAVA-1686, measured against the 40 ms ceiling of JAVA-1737).
 */
public final class PrecedenceSql {

    /** What a card that matches no rule ranks at: after every rule's position. */
    public static final int UNRANKED = 2147483647;

    private static final String WITH_RECURSIVE = "with recursive ";

    /** One row per rule, in list order: {@code ord} is its position, the facets it names, and its values. */
    private static final String RANKING = "ranking as materialized ("
            + "select e.ord as ord, e.rule->'facets' @> '[\"epics\"]' as epics, "
            + "e.rule->'facets' @> '[\"tags\"]' as tags_on, "
            + "e.rule->'facets' @> '[\"categories\"]' as categories_on, "
            + "e.rule->'facets' @> '[\"signals\"]' as signals_on, "
            + "array(select jsonb_array_elements_text(e.rule->'epicKeys')) as epic_keys, "
            + "array(select jsonb_array_elements_text(e.rule->'epicLabels')) as epic_labels, "
            + "array(select jsonb_array_elements_text(e.rule->'tags')) as rule_tags, "
            + "array(select jsonb_array_elements_text(e.rule->'categories')) as rule_categories, "
            + "array(select jsonb_array_elements_text(e.rule->'signals')) as rule_signals "
            + "from jsonb_array_elements(cast(? as jsonb)) with ordinality e(rule, ord))";

    private PrecedenceSql() {
    }

    /** The bind of a project's rules, or empty when the project has none (the statement then stays unranked). */
    public static Optional<String> ranking(DataSource dataSource, UUID projectId) {
        return JdbcPrecedenceRanking.of(dataSource, projectId);
    }

    /**
     * The statement with the {@code ranking} CTE in front of it: the ranked statement's one {@code ?} is the
     * ranking, and it is its first parameter. A recursive statement keeps its own {@code with recursive}.
     */
    public static String withRanking(String statement) {
        return statement.startsWith(WITH_RECURSIVE)
                ? WITH_RECURSIVE + RANKING + ", " + statement.substring(WITH_RECURSIVE.length())
                : "with " + RANKING + " " + statement;
    }

    /**
     * The position of the first rule of the ranking that {@code card} matches, {@link #UNRANKED} for none. Each facet a
     * rule names must match; a facet it does not name is skipped. The epic spellings are the ones
     * {@code PrecedenceRules.resolveEpics} resolves, and the match is the one {@code PrecedenceRules.matches} makes, so
     * the two agree. The expression has no parameter of its own: it reads the {@code ranking} CTE of {@link #withRanking}.
     */
    public static String rank(String card) {
        return "coalesce((select min(r.ord) from ranking r where "
                + "(not r.epics or upper(trim(" + card + ".epic)) = any(r.epic_keys) "
                + "or lower(trim(" + card + ".epic)) = any(r.epic_labels)) "
                + "and (not r.tags_on or r.rule_tags && array(select lower(trim(x)) from unnest(" + card + ".tags) x)) "
                + "and (not r.categories_on or " + card + ".category = any(r.rule_categories)) "
                + "and (not r.signals_on or r.rule_signals && " + card + ".signals)), " + UNRANKED + ")";
    }
}
