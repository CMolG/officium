import { LABELS_ES, LABELS_PT } from "./labels-i18n";

/**
 * Every string the layer shows, so an app with locales passes its own `labels` and nothing else.
 * `{email}`, `{seconds}` and `{route}` are filled in where the sentence needs them.
 */
export interface FeedbackLabels {
  report: string;
  suggest: string;
  cut: string;
  copy: string;
  paste: string;
  selectAll: string;
  openInNewTab: string;
  copyLink: string;
  clipboardBlocked: string;
  menuName: string;
  problemTitle: string;
  suggestionTitle: string;
  kindName: string;
  kindProblem: string;
  kindSuggestion: string;
  problemLabel: string;
  suggestionLabel: string;
  emailLabel: string;
  emailOptionalAnswer: string;
  emailOptional: string;
  pointedAt: string;
  sendProblem: string;
  sendSuggestion: string;
  sending: string;
  cancel: string;
  close: string;
  done: string;
  sentTitle: string;
  sentBodyPicture: string;
  sentBodyPlain: string;
  sentBodyEmail: string;
  errorEmpty: string;
  errorEmail: string;
  failedTitle: string;
  failedNetwork: string;
  failedInvalid: string;
  failedUnknown: string;
  copyText: string;
  tryAgain: string;
  limitedTitle: string;
  limitedBody: string;
  sendIn: string;
  goneTitle: string;
  goneBody: string;
}

export const DEFAULT_LABELS: FeedbackLabels = {
  report: "Report a problem",
  suggest: "Suggest a change",
  cut: "Cut",
  copy: "Copy",
  paste: "Paste",
  selectAll: "Select all",
  openInNewTab: "Open link in new tab",
  copyLink: "Copy link address",
  clipboardBlocked: "Your browser blocked reading the clipboard. Use the keyboard shortcut.",
  menuName: "Page actions",
  problemTitle: "Report a problem",
  suggestionTitle: "Suggest a change",
  kindName: "Kind",
  kindProblem: "Problem",
  kindSuggestion: "Suggestion",
  problemLabel: "What happened?",
  suggestionLabel: "What would make it better?",
  emailLabel: "Email",
  emailOptionalAnswer: "optional, if you want an answer",
  emailOptional: "optional",
  pointedAt: "What you pointed at",
  sendProblem: "Send report",
  sendSuggestion: "Send suggestion",
  sending: "Sending",
  cancel: "Cancel",
  close: "Close",
  done: "Done",
  sentTitle: "Got it. Thank you.",
  sentBodyPicture: "It's on the team's board with a picture of what you pointed at.",
  sentBodyPlain: "It's on the team's board.",
  sentBodyEmail: "We'll write to {email} when it's fixed.",
  errorEmpty: "Write a few words so we know what to change.",
  errorEmail: "That email is missing its ending, like .com. Or leave it empty.",
  failedTitle: "It didn't reach us.",
  failedNetwork: "Your connection dropped. Your words are still here.",
  failedInvalid: "The message is over 10,000 characters. Shorten it and try again. Your words are still here.",
  failedUnknown: "Something went wrong on our side. Your words are still here.",
  copyText: "Copy my text",
  tryAgain: "Try again",
  limitedTitle: "Too many reports at once.",
  limitedBody: "We pause sending for {seconds} seconds to keep out spam. The button wakes up on its own.",
  sendIn: "Send in {seconds} s",
  goneTitle: "We couldn't take its picture.",
  goneBody: "It closed before we could. We'll send the page address instead: {route}.",
};

const BY_LANGUAGE: Record<string, FeedbackLabels> = { es: LABELS_ES, pt: LABELS_PT };

/** The layer's words for a document language: the primary subtag picks Spanish or Portuguese, anything else is English. */
export function labelsFor(lang?: string | null): FeedbackLabels {
  const primary = lang?.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return BY_LANGUAGE[primary] ?? DEFAULT_LABELS;
}

/** Fills the `{name}` holes of a label. */
export function fillLabel(label: string, values: Record<string, string | number>): string {
  return label.replace(/\{(\w+)\}/g, (hole, key: string) => (key in values ? String(values[key]) : hole));
}
