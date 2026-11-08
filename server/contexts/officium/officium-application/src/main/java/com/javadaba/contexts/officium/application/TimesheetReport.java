package com.javadaba.contexts.officium.application;

import java.time.LocalDate;
import java.util.List;

/** {@code GET /officium/v1/projects/{id}/timesheet} (contract §3). */
public record TimesheetReport(LocalDate from, LocalDate to, List<TimeEntryView> entries, List<Total> totals) {

    public record Total(String who, double hours) {
    }
}
