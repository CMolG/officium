/*
 * Every word the calendar shows or announces (JAVA-1623). English defaults; a host passes its own
 * words (Tributa passes Spanish). Counts and durations are functions so a language can pluralize.
 */

export type CalendarLabels = {
  title: string;
  grid: string;
  previousMonth: string;
  nextMonth: string;
  today: string;
  todayMark: string;
  month: string;
  agenda: string;
  newEventOn: (day: string) => string;
  newEvent: string;
  editEvent: string;
  viewEvent: string;
  networkFailed: string;
  saveFailed: string;
  deleteFailed: string;
  noEventsThisDay: string;
  /** The agenda's empty line: "Nothing in the next 14 days." */
  nothingNext: (days: number) => string;
  /** "All day", where a time would be. */
  allDay: string;
  /** An app's slice of the calendar: "2 more this week from other apps". */
  moreFromOthers: (count: number, days: number) => string;
  eventsCount: (count: number) => string;
  monthChanged: (monthYear: string) => string;
  nextUp: (time: string, title: string) => string;
  relativeDay: (days: number) => string;
  reminders: string;
  fieldTitle: string;
  fieldDay: string;
  fieldStart: string;
  fieldEnd: string;
  fieldNotes: string;
  fromSource: (source: string) => string;
  /** The word for an event that is the person's own, in the day's list and the legend. */
  yours: string;
  /** "18:00 to 18:30". */
  timeRange: (from: string, to: string) => string;
  legendHelp: string;
  agendaEmptyHelp: string;
  optional: string;
  notesPlaceholder: string;
  saving: string;
  save: string;
  cancel: string;
  close: string;
  delete: string;
  keep: string;
  keepEditing: string;
  discard: string;
  deleteAsk: string;
  deleteBody: string;
  deleteConfirm: string;
  keepIt: string;
  discardAsk: string;
  discardBody: string;
  /** "Curriculum made this event, so it changes there." */
  readOnlyNotice: (source: string) => string;
  openIn: (source: string) => string;
  changeReminder: string;
  open: string;
  atStart: string;
  reminderBefore: (duration: string) => string;
  duration: (minutes: number) => string;
  alreadyPassed: string;
  errorTitle: string;
  errorDay: string;
  errorTime: string;
  errorEnd: string;
  errorReminders: string;
  loading: string;
  loadFailed: string;
  tryAgain: string;
  eventSaved: string;
  eventDeleted: string;
  calendarFull: string;
  eventMissing: string;
  eventNotFound: string;
  truncated: string;
  back: string;
};

export const DEFAULT_CALENDAR_LABELS: CalendarLabels = {
  title: "Calendar",
  grid: "Month",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  today: "Today",
  todayMark: "today",
  month: "Month",
  agenda: "Agenda",
  newEventOn: (day) => `New event on ${day}`,
  newEvent: "New event",
  editEvent: "Edit event",
  viewEvent: "Event details",
  networkFailed: "Couldn't reach your calendar. Nothing was saved.",
  saveFailed: "Couldn't save your event. Try again.",
  deleteFailed: "Couldn't delete this event. Try again.",
  noEventsThisDay: "No events this day",
  nothingNext: (days) => `Nothing in the next ${days} days.`,
  allDay: "All day",
  moreFromOthers: (count, days) => `${count} more ${days === 7 ? "this week " : ""}from other apps`,
  eventsCount: (count) => (count === 1 ? "1 event" : `${count} events`),
  monthChanged: (monthYear) => `Showing ${monthYear}`,
  nextUp: (time, title) => `Next up: ${title}, ${time}`,
  relativeDay: (days) => {
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days === -1) return "Yesterday";
    return days > 0 ? `In ${days} days` : `${-days} days ago`;
  },
  reminders: "Remind me",
  fieldTitle: "Title",
  fieldDay: "Day",
  fieldStart: "Starts",
  fieldEnd: "Ends",
  fieldNotes: "Notes",
  fromSource: (source) => `From ${source}`,
  yours: "yours",
  timeRange: (from, to) => `${from} to ${to}`,
  legendHelp: "Three marks at most; a fourth event shows as a number in the day's name.",
  agendaEmptyHelp: "Due dates and interviews from your apps appear here on their own.",
  optional: "optional",
  notesPlaceholder: "Link, address, agenda",
  saving: "Saving",
  save: "Save event",
  cancel: "Cancel",
  close: "Close",
  delete: "Delete",
  keep: "Keep",
  keepEditing: "Keep editing",
  discard: "Discard",
  deleteAsk: "Delete this event?",
  deleteBody: "It leaves your calendar and its reminder stops.",
  deleteConfirm: "Delete event",
  keepIt: "Keep it",
  discardAsk: "Discard your changes?",
  discardBody: "What you changed isn't saved yet.",
  readOnlyNotice: (source) => `${source} made this event, so it changes there.`,
  openIn: (source) => `Open in ${source}`,
  changeReminder: "Change my reminder",
  open: "Open",
  atStart: "At start",
  reminderBefore: (duration) => `${duration} before`,
  duration: (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    if (minutes < 1440) return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
    return minutes === 1440 ? "1 day" : `${minutes / 1440} days`;
  },
  alreadyPassed: "Already passed",
  errorTitle: "Add a title",
  errorDay: "Pick a day",
  errorTime: "Enter a valid time",
  errorEnd: "The end must be after the start",
  errorReminders: "Up to 5 reminders",
  loading: "Loading your calendar",
  loadFailed: "Couldn't load your calendar.",
  tryAgain: "Try again",
  eventSaved: "Event saved",
  eventDeleted: "Event deleted",
  calendarFull: "Your calendar is full. Delete old events to make room.",
  eventMissing: "This event was deleted elsewhere.",
  eventNotFound: "That event no longer exists.",
  truncated: "Showing the first 1,000 events of this period.",
  back: "Back to calendar",
};

export function resolveCalendarLabels(overrides?: Partial<CalendarLabels>): CalendarLabels {
  return { ...DEFAULT_CALENDAR_LABELS, ...overrides };
}
