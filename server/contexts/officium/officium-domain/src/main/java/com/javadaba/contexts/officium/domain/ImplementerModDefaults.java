package com.javadaba.contexts.officium.domain;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The data {@link ImplementerMatrix#DEFAULT_MODS} serves (card://JAVA-1877): the mods that carry what each retired
 * action role specialized in, mounted on the implementer's action cell by the card's category and signals. The server
 * side rides on the category rows because only {@code touches-ui} told a backend card from a frontend one; those mods
 * are written for "every new endpoint" or "every outbound call", so they say nothing to a UI-only card. Accessibility is
 * the implementer's own standard (WCAG 2.2 AA), not a mod: the market's {@code a11y-enforcer} asks for AAA.
 */
final class ImplementerModDefaults {

    private ImplementerModDefaults() {
    }

    static ModMatrix build() {
        Map<String, Map<Phase, List<String>>> rows = new LinkedHashMap<>();
        action(rows, "feature", "test-driven", "api-contract-first", "observability-ready", "resilient-backend");
        action(rows, "userStory", "test-driven", "api-contract-first", "observability-ready", "resilient-backend");
        action(rows, "enhancement", "test-driven", "regression-sentinel", "api-contract-first", "observability-ready",
                "resilient-backend");
        action(rows, "bug", "systematic-debug", "test-driven", "regression-sentinel", "deterministic-tests");
        action(rows, "hotfix", "hotfix-discipline", "regression-sentinel");
        action(rows, "regression", "systematic-debug", "test-driven", "regression-sentinel", "deterministic-tests");
        action(rows, "refactor", "regression-sentinel");
        action(rows, "technicalDebt", "regression-sentinel");
        action(rows, "infrastructure", "iac-pipeline-only", "supply-chain-integrity", "observability-ready");
        action(rows, "security", "vuln-remediation", "security-hardened", "supply-chain-integrity");
        action(rows, "testing", "deterministic-tests");
        action(rows, "routine", "runbook-execution");
        action(rows, "documentation", "docs-verified", "docs-sync");
        action(rows, "epic", "self-review");
        action(rows, Signal.TOUCHES_UI.wire(), "error-ux", "web-vitals");
        action(rows, Signal.TOUCHES_AUTH_PERMISSIONS_OR_PERSONAL_DATA.wire(), "security-hardened", "auth-guarded",
                "privacy-guard");
        action(rows, Signal.TOUCHES_HOT_PATHS_OR_HEAVY_QUERIES.wire(), "measured-performance");
        action(rows, Signal.TOUCHES_DATA_SCHEMA.wire(), "db-migrations-safe", "measured-performance");
        action(rows, Signal.TOUCHES_INFRASTRUCTURE.wire(), "iac-pipeline-only", "supply-chain-integrity",
                "observability-ready");
        return new ModMatrix(rows);
    }

    private static void action(Map<String, Map<Phase, List<String>>> rows, String row, String... mods) {
        Map<Phase, List<String>> cell = new EnumMap<>(Phase.class);
        cell.put(Phase.ACTION, List.of(mods));
        rows.put(row, cell);
    }
}
