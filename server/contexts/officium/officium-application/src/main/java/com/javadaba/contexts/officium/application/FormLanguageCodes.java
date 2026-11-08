package com.javadaba.contexts.officium.application;

import com.javadaba.contexts.officium.domain.OfficiumException;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * A project's form languages as Officium stores them (JAVA-1082): lower-case codes ({@code en},
 * {@code pt-br}), each once, at most ten, the default first. The same shape Quaestio accepts for a
 * form's languages, checked here so a project never stores one Quaestio would refuse.
 */
final class FormLanguageCodes {

    private static final Pattern CODE = Pattern.compile("^[a-z]{2,3}(-[a-z0-9]{2,8})?$");
    private static final int MAX = 10;

    private FormLanguageCodes() {
    }

    static List<String> valid(List<String> languages) {
        if (languages == null || languages.isEmpty()) {
            return List.of();
        }
        if (languages.size() > MAX) {
            throw OfficiumException.badRequest("form_languages_invalid", "At most " + MAX + " form languages");
        }
        Set<String> out = new LinkedHashSet<>();
        for (String language : languages) {
            String code = language == null ? "" : language.strip().toLowerCase(Locale.ROOT).replace('_', '-');
            if (!CODE.matcher(code).matches()) {
                throw OfficiumException.badRequest("form_languages_invalid",
                        "Not a language code: '" + language + "' (use en, es, pt-br)");
            }
            if (!out.add(code)) {
                throw OfficiumException.badRequest("form_languages_invalid", "Language listed twice: " + code);
            }
        }
        return List.copyOf(out);
    }
}
