import type { Announcement } from "./toast-announcements";

/**
 * The live regions of a viewport, drawn off screen. The toasts themselves are not live regions: a status
 * inside a live container is read twice by some readers (JAVA-1620, D5). Errors and warnings go through the
 * assertive one (`role="alert"`), everything else through the polite one (`role="status"`).
 */
export function ToastAnnouncer({ announcements, label }: { announcements: Announcement[]; label: string }) {
  return (
    <>
      <div role="status" aria-live="polite" aria-relevant="additions" aria-label={label} className="sr-only">
        {announcements.filter((announcement) => !announcement.assertive).map((announcement) => (
          <p key={announcement.key}>{announcement.text}</p>
        ))}
      </div>
      <div role="alert" aria-live="assertive" aria-relevant="additions" aria-label={label} className="sr-only">
        {announcements.filter((announcement) => announcement.assertive).map((announcement) => (
          <p key={announcement.key}>{announcement.text}</p>
        ))}
      </div>
    </>
  );
}
