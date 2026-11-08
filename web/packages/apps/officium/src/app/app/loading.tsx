/**
 * `/app/**` renders per request (the release gate, `layout.tsx`), and without a loading boundary
 * a click waits for that render before anything moves: on a slow server the sidebar looked dead
 * (JAVA-78). With this one, Next prefetches it and the navigation commits at once -- the URL and
 * the sidebar's current mark change, and the page shows this until its render arrives.
 */
export default function Loading() {
  return (
    <p className="py-10 text-center text-sm text-[color:var(--jd-muted)]" role="status">
      Loading…
    </p>
  );
}
