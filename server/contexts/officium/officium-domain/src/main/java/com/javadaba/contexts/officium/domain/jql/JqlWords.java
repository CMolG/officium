package com.javadaba.contexts.officium.domain.jql;

import com.javadaba.contexts.officium.domain.Category;
import com.javadaba.contexts.officium.domain.Executor;
import com.javadaba.contexts.officium.domain.Priority;
import com.javadaba.contexts.officium.domain.RejectionReason;
import com.javadaba.contexts.officium.domain.ReviewReturnReason;
import com.javadaba.contexts.officium.domain.Status;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Every way a status/category/priority/executor is written -- its wire id AND its board label
 * (the Java twin of {@code jql.ts}'s {@code STATUS_WORDS}/{@code CATEGORY_WORDS}/
 * {@code PRIORITY_WORDS}/{@code EXECUTOR_WORDS}, contract JDB-270). The labels themselves come
 * from {@code status-config.ts}/{@code category-config.tsx}, which are presentation-owned and
 * live in the frontend the domain cannot import across the TypeScript/Java boundary -- but the
 * WORDS are part of the query grammar a Jira user already knows ("status in (\"To do\", \"In
 * progress\")"), so they are copied here as a small, explicit table rather than left out.
 */
final class JqlWords {

    static final Map<String, Status> STATUS_WORDS = buildStatusWords();
    static final Map<String, Category> CATEGORY_WORDS = buildCategoryWords();
    static final Map<String, Priority> PRIORITY_WORDS = buildPriorityWords();
    static final Map<String, Executor> EXECUTOR_WORDS = buildExecutorWords();
    static final Map<String, RejectionReason> REJECTION_WORDS = buildRejectionWords();
    static final Map<String, ReviewReturnReason> RETURN_REASON_WORDS = buildReturnReasonWords();
    static final List<String> RUN_STATES = List.of("idle", "running", "completed", "failed");

    private JqlWords() {
    }

    static String norm(String s) {
        return s.toLowerCase(Locale.ROOT).replaceAll("[\\s_-]+", "");
    }

    /** Higher = more urgent, so {@code priority > Medium} reads the way it does in Jira -- same
     *  direction as {@code jql.ts}'s {@code priorityRank} (there computed as {@code 6 - weight};
     *  {@link Priority#rank()} is already 0-based, lower = more urgent, so this is {@code 4 -
     *  rank()}). */
    static int priorityRank(Priority p) {
        return 4 - p.rank();
    }

    private static Map<String, Status> buildStatusWords() {
        Map<String, Status> map = new LinkedHashMap<>();
        put(map, "refine", "Refine", Status.REFINE);
        put(map, "todo", "To do", Status.TODO);
        put(map, "doing", "In progress", Status.DOING);
        put(map, "ready", "Ready", Status.READY);
        put(map, "review", "Review", Status.REVIEW);
        put(map, "deploy", "Deploy", Status.DEPLOY);
        // "Done" and "Completed" are Completed's own id and label since 2026-09-23 -- until then
        // they were aliases of Deploy, the last column (same note as jql.ts's STATUS_WORDS).
        put(map, "done", "Completed", Status.DONE);
        put(map, "rejected", "Rejected", Status.REJECTED);
        return map;
    }

    /** A rejection reason by its wire id or its label: {@code not-needed} and "Not needed" alike. */
    private static Map<String, RejectionReason> buildRejectionWords() {
        Map<String, RejectionReason> map = new LinkedHashMap<>();
        for (RejectionReason reason : RejectionReason.values()) {
            put(map, reason.wire(), reason.label(), reason);
        }
        return map;
    }

    private static Map<String, ReviewReturnReason> buildReturnReasonWords() {
        Map<String, ReviewReturnReason> map = new LinkedHashMap<>();
        for (ReviewReturnReason reason : ReviewReturnReason.values()) {
            put(map, reason.wire(), reason.label(), reason);
        }
        return map;
    }

    private static Map<String, Category> buildCategoryWords() {
        Map<String, Category> map = new LinkedHashMap<>();
        put(map, "epic", "Epic", Category.EPIC);
        put(map, "feature", "Feature", Category.FEATURE);
        put(map, "userStory", "User story", Category.USER_STORY);
        put(map, "enhancement", "Enhancement", Category.ENHANCEMENT);
        put(map, "bug", "Bug", Category.BUG);
        put(map, "hotfix", "Hotfix", Category.HOTFIX);
        put(map, "regression", "Regression", Category.REGRESSION);
        put(map, "refactor", "Refactor", Category.REFACTOR);
        put(map, "technicalDebt", "Technical debt", Category.TECHNICAL_DEBT);
        put(map, "infrastructure", "Infrastructure", Category.INFRASTRUCTURE);
        put(map, "security", "Security", Category.SECURITY);
        put(map, "spike", "Spike", Category.SPIKE);
        put(map, "testing", "Testing", Category.TESTING);
        put(map, "routine", "Routine", Category.ROUTINE);
        put(map, "documentation", "Documentation", Category.DOCUMENTATION);
        map.put(norm("story"), Category.USER_STORY);
        map.put(norm("improvement"), Category.ENHANCEMENT);
        map.put(norm("techdebt"), Category.TECHNICAL_DEBT);
        map.put(norm("devops"), Category.INFRASTRUCTURE);
        map.put(norm("qa"), Category.TESTING);
        map.put(norm("chore"), Category.ROUTINE);
        map.put(norm("docs"), Category.DOCUMENTATION);
        return map;
    }

    private static Map<String, Priority> buildPriorityWords() {
        Map<String, Priority> map = new LinkedHashMap<>();
        put(map, "superHigh", "Critical", Priority.SUPER_HIGH);
        put(map, "high", "High", Priority.HIGH);
        put(map, "medium", "Medium", Priority.MEDIUM);
        put(map, "low", "Low", Priority.LOW);
        put(map, "superLow", "Very low", Priority.SUPER_LOW);
        // Jira's names for the two ends, same as jql.ts.
        map.put(norm("highest"), Priority.SUPER_HIGH);
        map.put(norm("lowest"), Priority.SUPER_LOW);
        return map;
    }

    private static Map<String, Executor> buildExecutorWords() {
        Map<String, Executor> map = new LinkedHashMap<>();
        map.put(norm("ai"), Executor.AI);
        map.put(norm("agent"), Executor.AI);
        map.put(norm("human"), Executor.HUMAN);
        map.put(norm("person"), Executor.HUMAN);
        return map;
    }

    private static <T> void put(Map<String, T> map, String id, String label, T value) {
        map.put(norm(id), value);
        map.put(norm(label), value);
    }
}
