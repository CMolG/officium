const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * How long ago a project or card last changed, as a tile says it (Off-Home): "Just now", "2 min ago",
 * "1 h ago", "Yesterday", then the date ("Oct 24"). A pure function of the two instants, so every case
 * is a unit test and the same project never reads differently on two renders of the same minute.
 */
export function updatedAgo(iso: string, now: number): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const minutes = Math.floor((now - then) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return "Yesterday";
  const date = new Date(then);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}
