import { formatDate } from "../backlog/format";

/** "just now" under a minute, "N min ago" under an hour, then the date as the header always showed it. */
export function relativeUpdated(iso: string, now: number): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return formatDate(iso.slice(0, 10));
}
