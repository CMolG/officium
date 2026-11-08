package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;
import com.javadaba.contexts.officium.domain.PrecedenceRule;
import com.javadaba.contexts.officium.domain.ports.PrecedenceTemplateCatalog.Facets;
import com.javadaba.contexts.officium.domain.ports.PrecedenceTemplateCatalog.Placeholder;
import com.javadaba.contexts.officium.domain.ports.PrecedenceTemplateCatalog.Rule;
import com.javadaba.contexts.officium.domain.ports.PrecedenceTemplateCatalog.Template;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A market template turned into the rules it stands for (JAVA-1692): its {@code {{NAME}}} tokens, allowed only in
 * epics and tags values, are filled from what the owner typed, and each rule goes through the same
 * {@link PrecedenceInput} the wire uses. The grammar is the market's ({@code marketplace.value_tokens}), pinned by a
 * fixture both sides read.
 */
final class PrecedenceTemplates {

    private static final Pattern TOKEN = Pattern.compile("\\{\\{([A-Z][A-Z0-9_]{0,31})}}");

    private PrecedenceTemplates() {
    }

    /** The token names a value holds, or empty when a brace is stray or a name is malformed. */
    static Optional<List<String>> tokens(String value) {
        List<String> names = new ArrayList<>();
        Matcher matcher = TOKEN.matcher(value);
        while (matcher.find()) {
            names.add(matcher.group(1));
        }
        String rest = TOKEN.matcher(value).replaceAll("");
        return rest.contains("{") || rest.contains("}") ? Optional.empty() : Optional.of(names);
    }

    /** The template's rules with every token filled; a declared placeholder left blank is refused, naming its key. */
    static List<PrecedenceRule> fill(Template template, Map<String, String> values) {
        Map<String, String> given = values == null ? Map.of() : values;
        for (Placeholder placeholder : template.placeholders()) {
            String value = given.get(placeholder.key());
            if (value == null || value.isBlank()) {
                throw new OfficiumException("precedence_placeholder_missing",
                        "The template needs a value for " + placeholder.key() + " (" + placeholder.label() + ")", 422);
            }
        }
        List<PrecedenceRule> rules = new ArrayList<>();
        for (Rule rule : template.rules()) {
            Facets match = rule.match();
            rules.add(PrecedenceInput.rule(rules.size(), null, rule.name(), rule.reason(),
                    filled(match.epics(), given), filled(match.tags(), given), match.categories(), match.signals(),
                    rule.priority(), rule.sprint()));
        }
        return rules;
    }

    private static List<String> filled(List<String> values, Map<String, String> given) {
        return values.stream()
                .map(value -> TOKEN.matcher(value)
                        .replaceAll(token -> Matcher.quoteReplacement(valueOf(given, token.group(1)))))
                .toList();
    }

    private static String valueOf(Map<String, String> given, String key) {
        String value = given.get(key);
        if (value == null || value.isBlank()) {
            throw new OfficiumException("precedence_placeholder_missing", "The template needs a value for " + key, 422);
        }
        return value.strip();
    }
}
