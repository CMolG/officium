package com.javadaba.contexts.officium.domain;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The user's matrix, the data {@link RoleMatrix#defaults()} serves: one row of roles per category from JAVA-328
 * to JAVA-342, the signal rows from JAVA-294's comment of 11:31, and the model and effort of every cell
 * (JAVA-915).
 */
final class RoleMatrixDefaults {

    /** Ready is delivery analysis, the same role for every category (JAVA-315). */
    private static final List<String> READY = List.of("delivery-analyst");

    private RoleMatrixDefaults() {
    }

    static RoleMatrix build() {
        Map<String, Map<Phase, List<String>>> rows = new LinkedHashMap<>();
        rows.put("epic", row(
                List.of("product-analyst", "software-architect", "tech-lead"),
                List.of(),
                List.of("architecture-reviewer", "acceptance-qa"),
                List.of("release-manager")));
        rows.put("feature", row(
                List.of("product-analyst", "software-architect", "tech-lead", "ux-ui-designer", "qa-strategist"),
                List.of("backend-developer", "frontend-developer", "data-engineer", "platform-engineer"),
                List.of("code-reviewer", "acceptance-qa", "ux-ui-accessibility-reviewer"),
                List.of("release-manager", "post-deploy-verifier", "production-watcher-sre")));
        rows.put("userStory", row(
                List.of("product-analyst", "ux-ui-designer", "tech-lead", "qa-strategist"),
                List.of("backend-developer", "frontend-developer"),
                List.of("acceptance-qa", "code-reviewer", "ux-ui-accessibility-reviewer"),
                List.of("post-deploy-verifier")));
        rows.put("enhancement", row(
                List.of("product-analyst", "tech-lead", "ux-ui-designer"),
                List.of("backend-developer", "frontend-developer"),
                List.of("code-reviewer", "acceptance-qa", "performance-reviewer"),
                List.of("post-deploy-verifier")));
        rows.put("bug", row(
                List.of("incident-analyst", "tech-lead"),
                List.of("backend-developer", "frontend-developer", "data-engineer", "test-automation-engineer"),
                List.of("code-reviewer", "acceptance-qa"),
                List.of("post-deploy-verifier")));
        rows.put("hotfix", row(
                List.of("incident-analyst"),
                List.of("on-call-engineer"),
                List.of("code-reviewer"),
                List.of("release-manager", "post-deploy-verifier", "production-watcher-sre")));
        rows.put("regression", row(
                List.of("incident-analyst", "tech-lead"),
                List.of("backend-developer", "frontend-developer", "test-automation-engineer"),
                List.of("code-reviewer", "performance-reviewer", "acceptance-qa"),
                List.of("post-deploy-verifier", "production-watcher-sre")));
        rows.put("refactor", row(
                List.of("software-architect", "tech-lead"),
                List.of("backend-developer", "frontend-developer", "data-engineer"),
                List.of("architecture-reviewer", "code-reviewer", "performance-reviewer"),
                List.of("production-watcher-sre")));
        rows.put("technicalDebt", row(
                List.of("software-architect", "tech-lead"),
                List.of("backend-developer", "frontend-developer", "data-engineer", "platform-engineer"),
                List.of("architecture-reviewer", "code-reviewer", "performance-reviewer"),
                List.of("post-deploy-verifier", "production-watcher-sre")));
        rows.put("infrastructure", row(
                List.of("platform-architect", "security-architect"),
                List.of("platform-engineer"),
                List.of("code-reviewer", "security-reviewer", "performance-reviewer"),
                List.of("release-manager", "production-watcher-sre")));
        rows.put("security", row(
                List.of("security-architect", "tech-lead"),
                List.of("security-engineer", "backend-developer", "frontend-developer", "platform-engineer"),
                List.of("security-reviewer", "code-reviewer"),
                List.of("release-manager", "production-watcher-sre")));
        rows.put("spike", row(
                List.of("tech-lead", "software-architect"),
                List.of("technical-researcher"),
                List.of("findings-evaluator", "architecture-reviewer"),
                List.of()));
        rows.put("testing", row(
                List.of("qa-strategist", "tech-lead"),
                List.of("test-automation-engineer"),
                List.of("code-reviewer"),
                List.of()));
        // Routine skips Refine; its code review applies only when the run left a diff.
        rows.put("routine", row(
                List.of(),
                List.of("routine-operator"),
                List.of("code-reviewer"),
                List.of("post-deploy-verifier", "production-watcher-sre")));
        // Its release manager applies only when the documentation is published.
        rows.put("documentation", row(
                List.of("tech-lead", "product-analyst"),
                List.of("technical-writer"),
                List.of("documentation-reviewer"),
                List.of("release-manager")));
        // A design deliverable (mockup, layout, visual spec) is the designer's to work, not only to
        // plan; user research stays the researcher's (card://JAVA-525).
        rows.put(RoleMatrix.SPIKE_UX_UI, row(
                List.of("ux-ui-designer", "product-analyst"),
                List.of("ux-ui-designer", "ux-researcher"),
                List.of("findings-evaluator", "ux-ui-accessibility-reviewer"),
                List.of()));

        Map<Signal, Map<Phase, List<String>>> signalRows = new EnumMap<>(Signal.class);
        signalRows.put(Signal.TOUCHES_AUTH_PERMISSIONS_OR_PERSONAL_DATA,
                signalRow(List.of("security-architect"), List.of(), List.of("security-reviewer")));
        signalRows.put(Signal.TOUCHES_UI,
                signalRow(List.of("ux-ui-designer"), List.of(), List.of("ux-ui-accessibility-reviewer")));
        signalRows.put(Signal.TOUCHES_HOT_PATHS_OR_HEAVY_QUERIES,
                signalRow(List.of(), List.of(), List.of("performance-reviewer")));
        signalRows.put(Signal.TOUCHES_DATA_SCHEMA,
                signalRow(List.of(), List.of("data-engineer"), List.of()));
        signalRows.put(Signal.TOUCHES_INFRASTRUCTURE,
                signalRow(List.of("platform-architect"), List.of("platform-engineer"), List.of()));
        return new RoleMatrix(rows, signalRows, runs());
    }

    private static Map<Phase, List<String>> row(List<String> refine, List<String> action, List<String> review,
            List<String> deploy) {
        Map<Phase, List<String>> row = new EnumMap<>(Phase.class);
        row.put(Phase.REFINE, refine);
        row.put(Phase.ACTION, action);
        row.put(Phase.READY, READY);
        row.put(Phase.REVIEW, review);
        row.put(Phase.DEPLOY, deploy);
        return row;
    }

    private static Map<Phase, List<String>> signalRow(List<String> refine, List<String> action, List<String> review) {
        Map<Phase, List<String>> row = new EnumMap<>(Phase.class);
        row.put(Phase.REFINE, refine);
        row.put(Phase.ACTION, action);
        row.put(Phase.REVIEW, review);
        return row;
    }

    /**
     * The user's defaults (2026-10-05): planning and checking someone's work reason on Opus, implementation and
     * closing on evidence run on Sonnet. Three cells deviate, approved the same day: a spike's work is research,
     * a security engineer's is where a subtle mistake costs most, and a documentation review is not a code one.
     */
    private static RunMatrix runs() {
        Map<Phase, RunConfig> byPhase = new EnumMap<>(Phase.class);
        byPhase.put(Phase.REFINE, RunConfig.of("claude-opus-5-5", "xhigh"));
        byPhase.put(Phase.ACTION, RunConfig.of("claude-sonnet-5-5", "medium"));
        byPhase.put(Phase.READY, RunConfig.of("claude-opus-5-5", "high"));
        byPhase.put(Phase.REVIEW, RunConfig.of("claude-opus-5-5", "high"));
        byPhase.put(Phase.DEPLOY, RunConfig.of("claude-sonnet-5-5", "medium"));
        Map<String, Map<Phase, RunCell>> cells = new LinkedHashMap<>();
        for (String row : RoleMatrix.rowKeys()) {
            Map<Phase, RunCell> cellsOfRow = new EnumMap<>(Phase.class);
            byPhase.forEach((phase, config) -> cellsOfRow.put(phase, RunCell.of(config)));
            cells.put(row, cellsOfRow);
        }
        RunCell research = RunCell.of(RunConfig.of("claude-opus-5-5", "high"));
        cells.get("spike").put(Phase.ACTION, research);
        cells.get(RoleMatrix.SPIKE_UX_UI).put(Phase.ACTION, research);
        cells.get("security").put(Phase.ACTION, research);
        cells.get("documentation").put(Phase.REVIEW, RunCell.of(RunConfig.of("claude-sonnet-5-5", "medium")));
        cells.put(RunMatrix.WORKFLOW,
                new EnumMap<>(Map.of(Phase.REFINE, RunCell.of(RunConfig.of("claude-opus-5-5", "max")))));
        return new RunMatrix(cells);
    }
}
