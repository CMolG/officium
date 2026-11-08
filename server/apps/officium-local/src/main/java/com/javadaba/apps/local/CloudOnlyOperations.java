package com.javadaba.apps.local;

import java.util.List;

/** The MCP operations that belong to Officium Cloud features and are not served by Officium Local. */
final class CloudOnlyOperations {

    private static final List<String> PREFIXES = List.of(
            "github.", "organization.", "teams.", "summons.", "tests.", "docs.changelog.", "mods.", "roles.get",
            "harness.", "forms.");

    private static final List<String> NAMES = List.of(
            "metrics.get", "usage.get", "value.get", "presence.get", "docs.presence", "sessions.list",
            "cards.queue", "cards.unqueue", "cards.priorFailures", "cards.attachForm", "members.list",
            "projects.integrationGate", "projects.setIntegrationGate", "projects.setQualitySettings",
            "harness.setup");

    boolean contains(String operation) {
        return operation != null
                && (NAMES.contains(operation) || PREFIXES.stream().anyMatch(operation::startsWith));
    }
}
