package com.javadaba.contexts.officium.domain.jql;

import java.time.Instant;
import java.util.List;

/** Jira rejects a status or a priority that does not exist; so does this, with the same words --
 *  the Java twin of {@code jql.ts}'s {@code invalidValue}. */
final class JqlValues {

    private JqlValues() {
    }

    static String invalid(JqlField def, JqlValue v) {
        String n = JqlWords.norm(v.raw());
        String bad = "The value '" + v.raw() + "' does not exist for the field '" + def.canonicalName() + "'.";
        return switch (def.kind()) {
            case STATUS -> JqlWords.STATUS_WORDS.containsKey(n) ? null : bad;
            case PRIORITY -> JqlWords.PRIORITY_WORDS.containsKey(n) ? null : bad;
            case EXECUTOR -> JqlWords.EXECUTOR_WORDS.containsKey(n) ? null : bad;
            case CATEGORY -> JqlWords.CATEGORY_WORDS.containsKey(n) ? null : bad;
            case RUN_STATE -> JqlWords.RUN_STATES.contains(n) ? null : bad;
            case REJECTION -> JqlWords.REJECTION_WORDS.containsKey(n) ? null : bad;
            case RETURN_REASON -> JqlWords.RETURN_REASON_WORDS.containsKey(n) ? null : bad;
            case BOOL -> List.of("true", "false", "yes", "no").contains(n) ? null : bad;
            case NUMBER -> isFinite(v.raw()) ? null : "'" + v.raw() + "' is not a number.";
            case DATE -> JqlDates.parse(v, Instant.now()) != null
                    ? null
                    : "'" + v.raw() + "' is not a date. Use 2026-09-01 or a relative one like -7d.";
            default -> null;
        };
    }

    /** JS's {@code Number.isFinite(Number(raw))}: an empty/blank string is {@code 0} (finite),
     *  and any trailing garbage makes it {@code NaN} (not finite). */
    private static boolean isFinite(String raw) {
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            return true;
        }
        try {
            double d = Double.parseDouble(trimmed);
            return !Double.isNaN(d) && !Double.isInfinite(d);
        } catch (NumberFormatException ex) {
            return false;
        }
    }
}
