package com.javadaba.contexts.officium.domain;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;

/**
 * The period a value report covers: a UTC calendar month (card://JAVA-1047). The subscription is paid
 * monthly, so cost per card divides the fee by the cards of the same month, and the previous month
 * sits beside it for the comparison.
 */
public record ReportPeriod(YearMonth month) {

    public Instant start() {
        return month.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    /** The first instant after the period. */
    public Instant end() {
        return month.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    public boolean contains(Instant instant) {
        return !instant.isBefore(start()) && instant.isBefore(end());
    }

    public ReportPeriod previous() {
        return new ReportPeriod(month.minusMonths(1));
    }
}
