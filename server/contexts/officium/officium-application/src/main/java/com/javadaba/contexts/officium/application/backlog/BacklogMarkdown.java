package com.javadaba.contexts.officium.application.backlog;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Java port of {@code .harness/skills/backlog/backlog.py}'s frontmatter YAML subset and body
 * sections ({@code ## Attachments}, {@code ## Comments}) -- same regexes, same key order, same
 * scalar-quoting rules, so a file this writes is byte-for-byte what {@code backlog.py} would
 * write for the same card (JDB-235). Ported, not reused, because the tree is Python there and
 * Java here; see {@code backlog.py} for the authoritative behaviour if the two ever diverge.
 */
public final class BacklogMarkdown {

    static final List<String> STATUSES = List.of("refine", "todo", "doing", "ready", "review", "deploy", "done",
            "rejected");
    static final List<String> PRIORITIES = List.of("superHigh", "high", "medium", "low", "superLow");
    static final List<String> RUN_STATES = List.of("idle", "running", "completed", "failed");

    private static final Map<String, String[]> LEGACY_STATUS = Map.of(
            "pending", new String[]{"todo", "idle"},
            "in_progress", new String[]{"doing", "running"},
            "completed", new String[]{"review", "completed"},
            "failed", new String[]{"refine", "failed"});
    private static final Map<String, String> LEGACY_PRIORITY = Map.of(
            "critical", "superHigh", "high", "high", "medium", "medium", "low", "low");

    private static final List<String> KEY_ORDER = List.of("task_id", "target_agent", "target_module", "priority",
            "status", "runState", "order", "estimate", "epic", "category", "signals", "tags", "assignees",
            "related", "rejection_reason", "rejection_card", "createdAt", "updatedAt");
    private static final List<String> LIST_KEYS = List.of("signals", "tags", "assignees", "related");

    private static final Pattern FRONTMATTER_RE = Pattern.compile("^---\\n(.*?)\\n---", Pattern.DOTALL);
    /** {@code ## Rejection} holds a rejected card's note (card://JAVA-1415): Markdown that may span
     *  lines, which the frontmatter's one-line scalars cannot carry. */
    private static final Pattern SECTION_RE = Pattern.compile(
            "(?:^|\\n)##[ \\t]+(Comments|Attachments|Rejection)[ \\t]*\\n(.*?)(?=\\n##[ \\t]+|$)",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    /** The card's action plan (2026-09-23): everything under it up to the Comments/Attachments/Rejection
     *  sections, sub-headings included -- a plan is often written in steps with their own `##`. */
    private static final Pattern ACTION_PLAN_RE = Pattern.compile("(?:^|\\n)##[ \\t]+Action plan[ \\t]*\\n(.*?)"
            + "(?=\\n##[ \\t]+(?:Comments|Attachments|Rejection)[ \\t]*(?:\\n|$)|$)",
            Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
    private static final Pattern COMMENT_LINE_RE = Pattern
            .compile("^-\\s+\\*\\*(.+?)\\*\\*\\s+\\(([^)]+)\\):\\s?(.*)$");
    private static final Pattern ATTACHMENT_LINE_RE = Pattern.compile("^-\\s+(.+?)(?:\\s+—\\s+(.+))?$");

    private BacklogMarkdown() {
    }

    public static class BacklogFormatException extends RuntimeException {
        public BacklogFormatException(String message) {
            super(message);
        }
    }

    // ── parsing ─────────────────────────────────────────────────────────────────────────────

    public static BacklogCard parse(String filename, String content) {
        Matcher fm = FRONTMATTER_RE.matcher(content);
        if (!fm.lookingAt()) {
            throw new BacklogFormatException(filename + ": no frontmatter block");
        }
        Map<String, Object> fields = BacklogFrontmatter.parse(fm.group(1));
        String rawBody = content.substring(fm.end()).strip();

        String firstLine = rawBody.isEmpty() ? "" : rawBody.split("\n", -1)[0];
        String title = firstLine.replaceFirst("^#+\\s*", "");
        if (title.isBlank()) {
            title = filename;
        }
        String bodyAfterTitle = rawBody.replaceFirst("^#+[^\\n]*\\n?", "");

        String[] statusRun = resolveStatus(fields.get("status"), fields.get("runState"));
        String status = statusRun[0];
        String runState = statusRun[1];

        String description;
        List<BacklogCard.Comment> comments = new ArrayList<>();
        List<BacklogCard.Attachment> attachments = new ArrayList<>();
        Matcher plan = ACTION_PLAN_RE.matcher(bodyAfterTitle);
        String actionPlan = "";
        int first = -1;
        if (plan.find()) {
            first = plan.start();
            actionPlan = plan.group(1).strip();
        }
        Matcher sections = SECTION_RE.matcher(bodyAfterTitle);
        String commentsBlock = "";
        String attachmentsBlock = "";
        String rejectionNote = "";
        while (sections.find()) {
            if (first < 0 || sections.start() < first) {
                first = sections.start();
            }
            switch (sections.group(1).toLowerCase(java.util.Locale.ROOT)) {
                case "comments" -> commentsBlock = sections.group(2).strip();
                case "attachments" -> attachmentsBlock = sections.group(2).strip();
                default -> rejectionNote = sections.group(2).strip();
            }
        }
        description = (first < 0 ? bodyAfterTitle : bodyAfterTitle.substring(0, first)).strip();

        for (String line : commentsBlock.split("\n")) {
            Matcher m = COMMENT_LINE_RE.matcher(line.strip());
            if (m.matches()) {
                comments.add(new BacklogCard.Comment(m.group(1), m.group(2), m.group(3)));
            }
        }
        for (String line : attachmentsBlock.split("\n")) {
            Matcher m = ATTACHMENT_LINE_RE.matcher(line.strip());
            if (m.matches()) {
                String path = m.group(1).strip();
                String name = m.group(2) == null ? "" : m.group(2).strip();
                if (name.isBlank()) {
                    int slash = path.lastIndexOf('/');
                    name = slash >= 0 ? path.substring(slash + 1) : path;
                }
                attachments.add(new BacklogCard.Attachment(path, name));
            }
        }

        return new BacklogCard(
                asString(fields.get("task_id"), ""),
                asString(fields.get("target_agent"), ""),
                asString(fields.get("target_module"), ""),
                resolvePriority(fields.get("priority")),
                status,
                runState,
                asInt(fields.get("order"), 0),
                asDouble(fields.get("estimate"), 0),
                asString(fields.get("epic"), ""),
                asString(fields.get("category"), ""),
                asStringList(fields.get("signals")),
                asStringList(fields.get("tags")),
                asStringList(fields.get("assignees")),
                asStringList(fields.get("related")),
                asString(fields.get("createdAt"), ""),
                asString(fields.get("updatedAt"), asString(fields.get("createdAt"), "")),
                title,
                description,
                actionPlan,
                comments,
                attachments,
                "rejected".equals(status)
                        ? new BacklogCard.Rejection(asString(fields.get("rejection_reason"), ""),
                                rejectionNote, asString(fields.get("rejection_card"), ""))
                        : null);
    }

    private static String[] resolveStatus(Object rawStatus, Object rawRunState) {
        if (rawStatus instanceof String s && STATUSES.contains(s)) {
            String run = rawRunState instanceof String r && RUN_STATES.contains(r) ? r : "idle";
            return new String[]{s, run};
        }
        if (rawStatus instanceof String s && LEGACY_STATUS.containsKey(s)) {
            return LEGACY_STATUS.get(s);
        }
        return LEGACY_STATUS.get("pending");
    }

    private static String resolvePriority(Object raw) {
        if (raw instanceof String s && PRIORITIES.contains(s)) {
            return s;
        }
        if (raw instanceof String s && LEGACY_PRIORITY.containsKey(s)) {
            return LEGACY_PRIORITY.get(s);
        }
        return "medium";
    }

    @SuppressWarnings("unchecked")
    private static List<String> asStringList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof String s) {
                result.add(s);
            }
        }
        return result;
    }

    private static String asString(Object value, String fallback) {
        return value instanceof String s ? s : fallback;
    }

    private static int asInt(Object value, int fallback) {
        if (value instanceof Number n) {
            return n.intValue();
        }
        if (value instanceof String s) {
            try {
                return Integer.parseInt(s);
            } catch (NumberFormatException ignored) {
                return fallback;
            }
        }
        return fallback;
    }

    private static double asDouble(Object value, double fallback) {
        if (value instanceof Number n) {
            return n.doubleValue();
        }
        return fallback;
    }

    // ── serialization ───────────────────────────────────────────────────────────────────────

    public static String serialize(BacklogCard card) {
        Map<String, Object> fields = new LinkedHashMap<>();
        fields.put("task_id", card.taskId());
        fields.put("priority", card.priority());
        fields.put("status", card.status());
        fields.put("runState", card.runState());
        fields.put("order", card.order());
        fields.put("estimate", numeric(card.estimate()));
        if (card.targetAgent() != null && !card.targetAgent().isBlank()) {
            fields.put("target_agent", card.targetAgent());
        }
        if (card.targetModule() != null && !card.targetModule().isBlank()) {
            fields.put("target_module", card.targetModule());
        }
        if (card.epic() != null && !card.epic().isBlank()) {
            fields.put("epic", card.epic());
        }
        if (card.category() != null && !card.category().isBlank()) {
            fields.put("category", card.category());
        }
        for (String key : LIST_KEYS) {
            List<String> value = switch (key) {
                case "signals" -> card.signals();
                case "tags" -> card.tags();
                case "assignees" -> card.assignees();
                default -> card.related();
            };
            if (value != null && !value.isEmpty()) {
                fields.put(key, value);
            }
        }
        fields.put("createdAt", card.createdAt());
        fields.put("updatedAt", card.updatedAt());
        if (card.rejection() != null) {
            fields.put("rejection_reason", card.rejection().reason());
            if (card.rejection().card() != null && !card.rejection().card().isBlank()) {
                fields.put("rejection_card", card.rejection().card());
            }
        }
        return "---\n" + BacklogFrontmatter.emit(fields, KEY_ORDER) + "\n---\n" + renderBody(card) + "\n";
    }

    /** {@code backlog.py} prints a whole-number estimate without a decimal point ({@code 4}, not
     *  {@code 4.0}) -- {@link BacklogCard#estimate} is a {@code double} only because Officium's
     *  domain is, so the emitted value is coerced back for byte parity. */
    private static Object numeric(double value) {
        return value == Math.rint(value) && !Double.isInfinite(value) ? (Object) (long) value : (Object) value;
    }

    private static String renderBody(BacklogCard card) {
        StringBuilder body = new StringBuilder();
        body.append("# ").append(card.title()).append("\n\n").append(card.description());
        if (card.actionPlan() != null && !card.actionPlan().isBlank()) {
            body.append("\n\n## Action plan\n\n").append(card.actionPlan());
        }
        if (card.rejection() != null) {
            body.append("\n\n## Rejection\n\n").append(card.rejection().note());
        }
        if (!card.attachments().isEmpty()) {
            body.append("\n\n## Attachments");
            for (BacklogCard.Attachment attachment : card.attachments()) {
                int slash = attachment.path().lastIndexOf('/');
                String base = slash >= 0 ? attachment.path().substring(slash + 1) : attachment.path();
                if (attachment.name() != null && !attachment.name().isBlank() && !attachment.name().equals(base)) {
                    body.append("\n- ").append(attachment.path()).append(" — ").append(attachment.name());
                } else {
                    body.append("\n- ").append(attachment.path());
                }
            }
        }
        if (!card.comments().isEmpty()) {
            body.append("\n\n## Comments");
            for (BacklogCard.Comment comment : card.comments()) {
                body.append("\n- **").append(comment.author()).append("** (").append(comment.date()).append("): ")
                        .append(comment.text());
            }
        }
        return body.toString();
    }
}
