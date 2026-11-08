/*
 * Locale and week start for the calendar (JAVA-1623, D8). Every input is an argument, so the three
 * week-info paths and the fallback are tested without patching the engine.
 */

type WeekInfo = { firstDay: number };
type LocaleLike = { getWeekInfo?: () => WeekInfo; weekInfo?: WeekInfo; maximize?: () => { region?: string } };
type IntlLike = { Locale?: new (tag: string) => LocaleLike };

// CLDR: regions whose week starts on Sunday (0) or Saturday (6). Everything else starts on Monday.
const SUNDAY_FIRST = new Set(["US", "CA", "JP", "BR", "IL", "IN", "KR", "MX", "PH", "TW", "HK", "ZA"]);
const SATURDAY_FIRST = new Set(["AE", "AF", "BH", "DZ", "EG", "IQ", "IR", "JO", "KW", "LY", "OM", "QA", "SA", "SD", "SY", "YE"]);

/** The first weekday (0 = Sunday) for `tag`, from the engine when it knows, else from CLDR's region table. */
export function firstDayOfWeek(tag: string, intl: IntlLike = Intl as IntlLike): number {
  const LocaleCtor = intl.Locale;
  if (!LocaleCtor) return 1;
  try {
    const locale = new LocaleCtor(tag);
    const info = locale.getWeekInfo?.() ?? locale.weekInfo;
    if (info) return info.firstDay % 7;
    const region = locale.maximize?.().region;
    if (region && SUNDAY_FIRST.has(region)) return 0;
    if (region && SATURDAY_FIRST.has(region)) return 6;
  } catch {
    // A tag the engine rejects falls through to the Monday default.
  }
  return 1;
}

/**
 * The locale the calendar renders in. A full account tag wins. A language-only account tag takes
 * the matching browser tag's region (account "es" + browser "es-ES" gives "es-ES"). With no account
 * locale, the browser's first language wins.
 */
export function resolveCalendarLocale(
  accountLocale: string | null | undefined,
  browserLocales: readonly string[],
): string {
  const browser = browserLocales[0] ?? "en-US";
  if (!accountLocale) return browser;
  if (accountLocale.includes("-")) return accountLocale;
  const language = accountLocale.toLowerCase();
  const match = browserLocales.find((tag) => tag.toLowerCase().split("-")[0] === language);
  return match ?? accountLocale;
}

export type CalendarFormats = {
  weekday: (instant: Date) => string;
  shortWeekday: (index: number) => string;
  monthYear: (instant: Date) => string;
  dayHeading: (instant: Date) => string;
  time: (instant: Date) => string;
};

/** Names and times in `locale`, read in `zone`. */
export function calendarFormats(locale: string, zone: string): CalendarFormats {
  const at = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: zone, ...options });
  const weekday = at({ weekday: "long" });
  const short = at({ weekday: "short" });
  const monthYear = at({ month: "long", year: "numeric" });
  const dayHeading = at({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const time = at({ hour: "2-digit", minute: "2-digit" });
  // 2026-01-04 is a Sunday, so index 0 is Sunday, matching `Date#getDay`.
  return {
    weekday: (instant) => weekday.format(instant),
    shortWeekday: (index) => short.format(new Date(Date.UTC(2026, 0, 4 + index, 12))),
    monthYear: (instant) => monthYear.format(instant),
    dayHeading: (instant) => dayHeading.format(instant),
    time: (instant) => time.format(instant),
  };
}
