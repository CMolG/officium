/*
 * The service worker (Off-Shell, JAVA-1674): the two things an installed Officium needs of one. It lets the browser
 * offer to install (a worker with a fetch handler, which changes nothing about how pages load), and it shows a
 * notification, and brings Officium to the front when it is clicked.
 *
 * TODO(backend): the "push" handler reads { title, body, url } from an event the server does not send yet. Web Push
 * needs a subscription endpoint (POST /notifications/push-subscriptions with the browser's PushSubscription, tied to the
 * account and device) and a sender on the summons; until then the tab shows notifications itself while it is open.
 *
 * A route handler and not `public/sw.js`, so the same file is served under the zone's basePath (scope /officium/).
 */
export const dynamic = "force-static";

const WORKER = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Officium", { body: data.body, data: { url: data.url }, tag: data.tag }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope + "app";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.registration.scope));
      return open ? open.navigate(url).then((w) => w && w.focus()) : self.clients.openWindow(url);
    }),
  );
});
`;

export function GET() {
  return new Response(WORKER, {
    headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-cache" },
  });
}
