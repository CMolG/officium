package com.javadaba.contexts.officium.infrastructure.adapters.outbound;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.javadaba.contexts.officium.domain.PrecedenceMatch;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.PrecedenceRules;
import com.javadaba.contexts.officium.domain.ports.PrecedenceRepository;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.TreeSet;
import java.util.UUID;

/**
 * The bind of {@code cards.next}'s ranked order (JAVA-1686, ADR 0032): the project's rules, each resolved to the
 * spellings a card may carry, as one jsonb array whose position is the rule's rank. Empty when the project has no
 * rules, so the statement stays the unranked one. The epic names are read narrowly, never the whole project.
 */
final class JdbcPrecedenceRanking {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private JdbcPrecedenceRanking() {
    }

    static Optional<String> of(DataSource dataSource, UUID projectId) {
        List<PrecedenceRule> rules = new JdbcPrecedenceRepository(dataSource).find(projectId)
                .map(PrecedenceRepository.Stored::rules).orElse(List.of());
        if (rules.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(write(PrecedenceRules.resolveEpics(rules, epics(dataSource, projectId))));
    }

    private static List<PrecedenceRules.EpicName> epics(DataSource dataSource, UUID projectId) {
        List<PrecedenceRules.EpicName> epics = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("select key, epic from officium_card "
                        + "where project_id = ? and category = 'epic' and deleted_at is null")) {
            statement.setObject(1, projectId);
            try (ResultSet rs = statement.executeQuery()) {
                while (rs.next()) {
                    epics.add(new PrecedenceRules.EpicName(rs.getString(1), rs.getString(2)));
                }
            }
        } catch (SQLException ex) {
            throw new IllegalStateException("Unable to read the epics of " + projectId, ex);
        }
        return epics;
    }

    /**
     * One object per rule: {@code facets} names the facets the rule names (the SQL skips the others), and the
     * tags are lower-cased and trimmed, the way the Java rank compares them.
     */
    static String write(List<PrecedenceRules.Resolved> resolved) {
        ArrayNode array = MAPPER.createArrayNode();
        resolved.forEach(rule -> array.add(rule(rule)));
        try {
            return MAPPER.writeValueAsString(array);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Unable to write the precedence ranking", ex);
        }
    }

    private static ObjectNode rule(PrecedenceRules.Resolved rule) {
        ObjectNode node = MAPPER.createObjectNode();
        PrecedenceMatch match = rule.match();
        ArrayNode facets = node.putArray("facets");
        if (!match.epics().isEmpty()) {
            facets.add("epics");
        }
        if (!match.tags().isEmpty()) {
            facets.add("tags");
        }
        if (match.categoriesNamed()) {
            facets.add("categories");
        }
        if (match.signalsNamed()) {
            facets.add("signals");
        }
        strings(node.putArray("epicKeys"), new TreeSet<>(rule.epicKeys()));
        strings(node.putArray("epicLabels"), new TreeSet<>(rule.epicLabels()));
        strings(node.putArray("tags"), match.tags().stream().map(t -> t.trim().toLowerCase(Locale.ROOT))
                .distinct().toList());
        strings(node.putArray("categories"), match.categories().stream().map(c -> c.wire()).toList());
        strings(node.putArray("signals"), match.signals().stream().map(s -> s.wire()).toList());
        return node;
    }

    private static void strings(ArrayNode array, Iterable<String> values) {
        values.forEach(array::add);
    }
}
