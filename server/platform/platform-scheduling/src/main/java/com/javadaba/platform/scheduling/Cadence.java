package com.javadaba.platform.scheduling;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/**
 * How often a job runs, and so which slot an instant falls in. The slot is the key two app-api
 * instances agree on without talking to each other: whoever claims it first runs the job, the
 * other one finds it taken.
 */
public sealed interface Cadence {

    /** The slot {@code now} falls in. */
    String slotAt(Instant now);

    /** How long a slot lasts: what the missed-run alert counts in. */
    Duration period();

    static Cadence every(Duration interval) {
        return new Every(interval);
    }

    /**
     * A daily job from the cron its config already carries. Only the daily form
     * {@code "s m h * * ?"} is accepted: it is the only one in the tree, and anything else
     * would need a cron engine to know which slot an instant falls in.
     */
    static Cadence dailyCron(String cron, ZoneId zone) {
        String[] fields = cron.trim().split("\\s+");
        boolean daily = fields.length == 6 && fields[3].equals("*") && fields[4].equals("*")
                && (fields[5].equals("?") || fields[5].equals("*"));
        if (!daily) {
            throw new IllegalArgumentException("Only a daily cron \"s m h * * ?\" is supported, got \"" + cron + "\"");
        }
        try {
            return new Daily(LocalTime.of(Integer.parseInt(fields[2]), Integer.parseInt(fields[1]),
                    Integer.parseInt(fields[0])), zone);
        } catch (RuntimeException e) {
            throw new IllegalArgumentException("Only a daily cron \"s m h * * ?\" is supported, got \"" + cron + "\"",
                    e);
        }
    }

    /** Slot = the start of the {@code interval}-long bucket {@code now} falls in, counted from the epoch. */
    record Every(Duration interval) implements Cadence {

        public Every {
            if (interval.isNegative() || interval.isZero()) {
                throw new IllegalArgumentException("A job's interval must be positive, got " + interval);
            }
        }

        @Override
        public String slotAt(Instant now) {
            long millis = interval.toMillis();
            return Instant.ofEpochMilli(Math.floorDiv(now.toEpochMilli(), millis) * millis).toString();
        }

        @Override
        public Duration period() {
            return interval;
        }
    }

    /**
     * Slot = the local date of the most recent due time at or before {@code now}. Before today's
     * time it is still yesterday's slot, so a restart at 03:00 finds yesterday's run done and
     * waits, and a restart at 10:00 after missing 04:15 finds today's slot empty and catches up.
     */
    record Daily(LocalTime at, ZoneId zone) implements Cadence {

        @Override
        public String slotAt(Instant now) {
            ZonedDateTime local = now.atZone(zone);
            LocalDate day = local.toLocalTime().isBefore(at) ? local.toLocalDate().minusDays(1) : local.toLocalDate();
            return day.toString();
        }

        @Override
        public Duration period() {
            return Duration.ofDays(1);
        }
    }
}
