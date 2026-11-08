package com.javadaba.contexts.officium.application.backlog;

import java.util.List;

/**
 * The parsed shape of one {@code .backlog/*.md} file -- a 1:1 mirror of {@code backlog.py}'s
 * internal card dict (JDB-235). {@code order}/{@code estimate} stay as parsed (estimate keeps
 * whether it was a whole number, since {@code backlog.py} prints {@code 4}, not {@code 4.0}).
 */
public record BacklogCard(
        String taskId,
        String targetAgent,
        String targetModule,
        String priority,
        String status,
        String runState,
        int order,
        double estimate,
        String epic,
        /** The category's wire value, or empty: {@code backlog.py} files never carried one. */
        String category,
        /** The signals' wire values (JAVA-294): like the category, {@code backlog.py} never had them. */
        List<String> signals,
        List<String> tags,
        List<String> assignees,
        List<String> related,
        String createdAt,
        String updatedAt,
        String title,
        String description,
        /** The {@code ## Action plan} section, if the file has one (empty otherwise). */
        String actionPlan,
        List<Comment> comments,
        List<Attachment> attachments,
        /** A rejected card's reason (card://JAVA-1415); null on every other card. */
        Rejection rejection) {

    public BacklogCard(String taskId, String targetAgent, String targetModule, String priority, String status,
            String runState, int order, double estimate, String epic, String category, List<String> signals,
            List<String> tags, List<String> assignees, List<String> related, String createdAt, String updatedAt,
            String title, String description, String actionPlan, List<Comment> comments, List<Attachment> attachments) {
        this(taskId, targetAgent, targetModule, priority, status, runState, order, estimate, epic, category, signals,
                tags, assignees, related, createdAt, updatedAt, title, description, actionPlan, comments, attachments,
                null);
    }

    /** {@code reason} is the wire id ({@code rejection_reason}), {@code card} the key it names
     *  ({@code rejection_card}), both empty when absent; {@code note} is the {@code ## Rejection} section. */
    public record Rejection(String reason, String note, String card) {
    }

    public record Comment(String author, String date, String text) {
    }

    public record Attachment(String path, String name) {
    }
}
