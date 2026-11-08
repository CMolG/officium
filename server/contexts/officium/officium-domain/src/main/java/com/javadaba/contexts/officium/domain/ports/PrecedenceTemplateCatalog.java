package com.javadaba.contexts.officium.domain.ports;

import java.util.List;
import java.util.Optional;

/**
 * The precedence-rule templates the Fluxor market's presets carry (JAVA-1692, ADR 0018's read path). Templates are
 * catalog content, not project data: reading them takes no account, and importing one goes through the project's
 * own precedence write.
 */
public interface PrecedenceTemplateCatalog {

    /** Every template of every preset, ordered by preset key, then template id. */
    List<Template> templates();

    default Optional<Template> find(String presetKey, String templateId) {
        return templates().stream()
                .filter(t -> t.presetKey().equals(presetKey) && t.id().equals(templateId))
                .findFirst();
    }

    record Template(String presetKey, int presetVersion, String id, String title, String description,
            List<Placeholder> placeholders, List<Rule> rules) {
    }

    record Placeholder(String key, String label) {
    }

    /** A rule as the market writes it: wire strings, with {@code {{NAME}}} tokens still in epics and tags. */
    record Rule(String name, String reason, Facets match, String priority, String sprint) {
    }

    record Facets(List<String> epics, List<String> tags, List<String> categories, List<String> signals) {
    }
}
