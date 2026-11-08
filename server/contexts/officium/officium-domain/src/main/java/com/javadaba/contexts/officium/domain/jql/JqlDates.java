package com.javadaba.contexts.officium.domain.jql;

import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * A date value as an instant range {@code [from, to)}: a bare day covers the whole day -- the
 * Java twin of {@code jql.ts}'s {@code parseDateValue} (contract JDB-270). One declared
 * difference: {@code startOfDay()}/{@code startOfWeek()} use UTC here, where the browser used
 * whatever time zone it was running in -- the server has no "local" zone of its own, and the
 * contract already fixes every other timestamp to UTC (officium-api.md §2).
 */
final class JqlDates {

    private static final Pattern RELATIVE = Pattern.compile("^([+-]?)(\\d+)([mhdwMHDW])$");
    private static final Pattern DAY = Pattern.compile("^(\\d{4})[-/](\\d{2})[-/](\\d{2})$");

    private JqlDates() {
    }

    record Range(Instant from, Instant to) {
    }

    static Range parse(JqlValue v, Instant now) {
        if (v.fn() == JqlFunction.NOW) {
            return new Range(now, now.plusMillis(1));
        }
        if (v.fn() == JqlFunction.START_OF_DAY || v.fn() == JqlFunction.START_OF_WEEK) {
            ZonedDateTime day = now.atZone(ZoneOffset.UTC).truncatedTo(ChronoUnit.DAYS);
            if (v.fn() == JqlFunction.START_OF_WEEK) {
                // ISO day-of-week is 1 (Monday) .. 7 (Sunday) already -- same Monday-start result
                // as jql.ts's `(d.getDay() + 6) % 7` over JS's 0 (Sunday) .. 6 (Saturday).
                day = day.minusDays(day.getDayOfWeek().getValue() - 1);
            }
            Instant at = day.toInstant();
            return new Range(at, at.plusMillis(1));
        }
        Matcher relative = RELATIVE.matcher(v.raw());
        if (relative.matches()) {
            long unit = switch (relative.group(3).toLowerCase(Locale.ROOT)) {
                case "m" -> 60_000L;
                case "h" -> 3_600_000L;
                case "d" -> 86_400_000L;
                default -> 604_800_000L; // "w"
            };
            long sign = "+".equals(relative.group(1)) ? 1 : -1;
            long amount = Long.parseLong(relative.group(2));
            Instant at = now.plusMillis(sign * amount * unit);
            return new Range(at, at.plusMillis(1));
        }
        Matcher day = DAY.matcher(v.raw());
        if (day.matches()) {
            try {
                LocalDate date = LocalDate.of(Integer.parseInt(day.group(1)), Integer.parseInt(day.group(2)),
                        Integer.parseInt(day.group(3)));
                Instant from = date.atStartOfDay(ZoneOffset.UTC).toInstant();
                return new Range(from, from.plusMillis(86_400_000L));
            } catch (DateTimeException | NumberFormatException ex) {
                return null;
            }
        }
        return null;
    }
}
