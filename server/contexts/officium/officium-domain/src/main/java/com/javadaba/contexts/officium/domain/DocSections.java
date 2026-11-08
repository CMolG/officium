package com.javadaba.contexts.officium.domain;

import java.util.List;
import java.util.Locale;

/**
 * The page schema's section matrix (JAVA-781, {@code docs.schema}): which H2 sections a page takes,
 * per type, and the order it lays them out in. {@link DocLint} and {@link DocLintPurpose} read it.
 */
final class DocSections {

    /**
     * One H2 section. {@code needs} holds one letter per type in {@link #TYPE_ORDER}: {@code R}
     * required, {@code O} optional, {@code X} not for that type.
     */
    record Section(String key, String heading, String needs, int minItems, int maxItems) {

        char need(String type) {
            return needs.charAt(TYPE_ORDER.indexOf(type));
        }
    }

    static final List<String> TYPE_ORDER = List.of("tutorial", "how-to", "reference", "explanation");

    /** In the order a page lays them out. */
    static final List<Section> ALL = List.of(
            new Section("prerequisites", "Prerequisites", "RRXX", 1, 7),
            new Section("key concepts", "Key concepts", "OXXR", 2, 7),
            new Section("overview", "Overview", "OOOR", 2, 7),
            new Section("steps", "Steps", "RRXX", 2, 7),
            new Section("check the result", "Check the result", "RRXX", 2, 7),
            new Section("examples", "Examples", "OORO", 2, 7),
            new Section("reference", "Reference", "XORX", 2, 7),
            new Section("troubleshooting", "Troubleshooting", "OROX", 2, 7),
            new Section("faq", "FAQ", "OOOO", 2, 7),
            new Section("next steps", "Next steps", "RROR", 1, 5),
            new Section("changelog", "Changelog", "XXOX", 2, 7));

    private DocSections() {
    }

    /** A heading's key: its text in lower case, without the punctuation it ends with. */
    static String keyOf(String heading) {
        return heading.toLowerCase(Locale.ROOT).replaceAll("[.:?!]+$", "").strip();
    }

    /** The section a heading's key names, or {@code null} when the schema names none. */
    static Section find(String key) {
        return ALL.stream().filter(section -> section.key().equals(key)).findFirst().orElse(null);
    }

    /** How many sections a page of this type takes at most: every one that is not {@code X}. */
    static int allowed(String type) {
        return (int) ALL.stream().filter(section -> section.need(type) != 'X').count();
    }
}
