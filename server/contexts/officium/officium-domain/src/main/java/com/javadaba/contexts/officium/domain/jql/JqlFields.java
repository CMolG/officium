package com.javadaba.contexts.officium.domain.jql;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** The field table -- the Java twin of {@code jql.ts}'s {@code FIELDS}/{@code FIELD_BY_NAME}/
 *  {@code fieldById}. Same seventeen fields, same aliases, same order (contract JDB-270). */
final class JqlFields {

    private static final List<JqlOp> EQ = List.of(JqlOp.EQ, JqlOp.NEQ, JqlOp.IN, JqlOp.NOT_IN);
    private static final List<JqlOp> ORDERED = List.of(JqlOp.EQ, JqlOp.NEQ, JqlOp.GT, JqlOp.GTE, JqlOp.LT, JqlOp.LTE);
    private static final List<JqlOp> EMPTY_OPS = List.of(JqlOp.IS, JqlOp.IS_NOT);

    static final List<JqlField> ALL = List.of(
            new JqlField(JqlFieldId.STATUS, List.of("status"), JqlFieldKind.STATUS, EQ, true),
            new JqlField(JqlFieldId.PRIORITY, List.of("priority"), JqlFieldKind.PRIORITY,
                    concat(EQ, JqlOp.GT, JqlOp.GTE, JqlOp.LT, JqlOp.LTE), true),
            new JqlField(JqlFieldId.ASSIGNEE, List.of("assignee"), JqlFieldKind.NAME,
                    concat(EQ, JqlOp.CONTAINS, JqlOp.IS, JqlOp.IS_NOT), true),
            new JqlField(JqlFieldId.EXECUTOR, List.of("executor"), JqlFieldKind.EXECUTOR, EQ, true),
            // "type" and "issuetype" are what a Jira hand types for the same thing (JAVA-28, same as jql.ts).
            new JqlField(JqlFieldId.CATEGORY, List.of("category", "type", "issuetype"), JqlFieldKind.CATEGORY,
                    concat(EQ, JqlOp.IS, JqlOp.IS_NOT), true),
            new JqlField(JqlFieldId.TEXT, List.of("text"), JqlFieldKind.TEXT,
                    List.of(JqlOp.CONTAINS, JqlOp.NOT_CONTAINS), false),
            new JqlField(JqlFieldId.SUMMARY, List.of("summary", "title"), JqlFieldKind.TEXT,
                    List.of(JqlOp.CONTAINS, JqlOp.NOT_CONTAINS), true),
            new JqlField(JqlFieldId.DESCRIPTION, List.of("description"), JqlFieldKind.TEXT,
                    List.of(JqlOp.CONTAINS, JqlOp.NOT_CONTAINS, JqlOp.IS, JqlOp.IS_NOT), false),
            new JqlField(JqlFieldId.EPIC, List.of("epic", "epiclink"), JqlFieldKind.NAME,
                    concat(EQ, JqlOp.CONTAINS, JqlOp.IS, JqlOp.IS_NOT), true),
            new JqlField(JqlFieldId.LABELS, List.of("labels", "label", "tags", "tag"), JqlFieldKind.LIST,
                    concat(EQ, JqlOp.IS, JqlOp.IS_NOT), false),
            new JqlField(JqlFieldId.BLOCKED, List.of("blocked"), JqlFieldKind.BOOL, List.of(JqlOp.EQ, JqlOp.NEQ),
                    false),
            new JqlField(JqlFieldId.KEY, List.of("key", "issuekey"), JqlFieldKind.KEY,
                    concat(EQ, JqlOp.GT, JqlOp.GTE, JqlOp.LT, JqlOp.LTE), true),
            new JqlField(JqlFieldId.CREATED, List.of("created", "createddate"), JqlFieldKind.DATE, ORDERED, true),
            new JqlField(JqlFieldId.UPDATED, List.of("updated", "updateddate"), JqlFieldKind.DATE, ORDERED, true),
            new JqlField(JqlFieldId.ESTIMATE, List.of("estimate", "originalestimate"), JqlFieldKind.NUMBER, ORDERED,
                    true),
            new JqlField(JqlFieldId.RUN_STATE, List.of("runstate"), JqlFieldKind.RUN_STATE, EQ, false),
            // Why a rejected card was rejected (card://JAVA-1415); empty on every other card.
            new JqlField(JqlFieldId.REJECTION, List.of("rejection"), JqlFieldKind.REJECTION,
                    concat(EQ, JqlOp.IS, JqlOp.IS_NOT), false),
            // How many times a card was sent back from review or deploy, and why (card://JAVA-1416).
            new JqlField(JqlFieldId.REVIEW_RETURNS, List.of("reviewreturns", "sentback"), JqlFieldKind.NUMBER,
                    ORDERED, false),
            new JqlField(JqlFieldId.RETURN_REASON, List.of("returnreason"), JqlFieldKind.RETURN_REASON,
                    concat(EQ, JqlOp.IS, JqlOp.IS_NOT), false));

    private static final Map<String, JqlField> BY_NAME = buildByName();
    private static final Map<JqlFieldId, JqlField> BY_ID = buildById();

    private JqlFields() {
    }

    private static List<JqlOp> concat(List<JqlOp> base, JqlOp... more) {
        List<JqlOp> result = new ArrayList<>(base);
        result.addAll(List.of(more));
        return List.copyOf(result);
    }

    private static Map<String, JqlField> buildByName() {
        Map<String, JqlField> map = new LinkedHashMap<>();
        for (JqlField field : ALL) {
            for (String name : field.names()) {
                map.put(name, field);
            }
        }
        return map;
    }

    private static Map<JqlFieldId, JqlField> buildById() {
        Map<JqlFieldId, JqlField> map = new LinkedHashMap<>();
        for (JqlField field : ALL) {
            map.put(field.id(), field);
        }
        return map;
    }

    /** {@code norm}alized already -- callers pass {@link JqlWords#norm}. */
    static JqlField byName(String normalized) {
        return BY_NAME.get(normalized);
    }

    static JqlField byId(JqlFieldId id) {
        return BY_ID.get(id);
    }

    /** The canonical name of a field, as it is written in a query (contract JDB-270: same as
     *  {@code jql.ts}'s {@code fieldName}). */
    static String canonicalName(JqlFieldId id) {
        return byId(id).canonicalName();
    }

    /** "Try status, priority, assignee, executor, category…" -- the first five, same as
     *  {@code jql.ts}'s {@code FIELDS.slice(0, 5)}. */
    static String hint() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 5 && i < ALL.size(); i++) {
            if (i > 0) {
                sb.append(", ");
            }
            sb.append(ALL.get(i).canonicalName());
        }
        return sb.toString();
    }
}
