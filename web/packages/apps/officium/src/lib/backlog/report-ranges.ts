/**
 * The time report's quick ranges (Off-Board2, "Time report": This week, Last week, This month). Pure functions of
 * a day, so each is a unit test and none depends on the clock. A week runs Monday to Sunday; the current ones
 * stop at `today`, because a report of days that have not happened is empty by construction.
 */
export interface ReportRange {
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The Monday of the week `today` falls in, as a UTC instant at midnight. */
function mondayOf(today: string): number {
  const ms = Date.parse(`${today}T00:00:00Z`);
  const sinceMonday = (new Date(ms).getUTCDay() + 6) % 7;
  return ms - sinceMonday * DAY_MS;
}

export function thisWeek(today: string): ReportRange {
  return { from: iso(mondayOf(today)), to: today };
}

export function lastWeek(today: string): ReportRange {
  const monday = mondayOf(today);
  return { from: iso(monday - 7 * DAY_MS), to: iso(monday - DAY_MS) };
}

export function thisMonth(today: string): ReportRange {
  return { from: `${today.slice(0, 8)}01`, to: today };
}
