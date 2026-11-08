import { BASE_PATH } from "../site";

/*
 * Officium as an installed app and its notifications (Off-Shell, "Officium on your phone and desktop", JAVA-1674): the
 * service worker, the browser's install offer, and the permission to notify. One small store the shell and its menus
 * read. Web half of a `.native` pair: the Android app is installed from the store and notifies through the system.
 */

export type NotificationState = "unsupported" | "needs-install" | "default" | "denied" | "granted";

export interface PwaSnapshot {
  /** The browser offered to install and the person has not yet. */
  canInstall: boolean;
  /** Officium runs in its own window already. */
  installed: boolean;
  notifications: NotificationState;
}

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let offer: InstallPrompt | null = null;
let started = false;
const listeners = new Set<() => void>();

const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

function notificationState(): NotificationState {
  if (typeof Notification === "undefined") return isIos() && !isStandalone() ? "needs-install" : "unsupported";
  return Notification.permission;
}

function read(): PwaSnapshot {
  return { canInstall: offer !== null, installed: isStandalone(), notifications: notificationState() };
}

const SERVER: PwaSnapshot = { canInstall: false, installed: false, notifications: "unsupported" };
let snapshot: PwaSnapshot = SERVER;

function changed() {
  snapshot = read();
  listeners.forEach((listener) => listener());
}

/** Registers the worker and listens for the install offer, once. Safe to call from every mount. */
export function startPwa(): void {
  if (started) return;
  started = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    offer = event as InstallPrompt;
    changed();
  });
  window.addEventListener("appinstalled", () => {
    offer = null;
    changed();
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register(`${BASE_PATH}/sw.js`, { scope: `${BASE_PATH}/` }).catch(() => {});
  }
  changed();
}

export function subscribePwa(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const pwaSnapshot = (): PwaSnapshot => snapshot;
export const pwaServerSnapshot = (): PwaSnapshot => SERVER;

/** Shows the browser's own install question; true when the person accepted it. */
export async function promptInstall(): Promise<boolean> {
  const pending = offer;
  if (!pending) return false;
  await pending.prompt();
  const { outcome } = await pending.userChoice;
  offer = null;
  changed();
  return outcome === "accepted";
}

/** Asks the browser for permission (after our own sentence); returns what it decided. */
export async function askForNotifications(): Promise<NotificationState> {
  if (typeof Notification !== "undefined") await Notification.requestPermission();
  changed();
  return notificationState();
}

export interface LocalNotice {
  title: string;
  body: string;
  /** Where a click lands, inside Officium, without the basePath: the card or the summons. */
  url: string;
  /** One per item: a new round replaces it. */
  tag: string;
}

/**
 * A notification from the open tab, shown only while the tab is in the background and the person allowed them. This is
 * what works today; a closed app needs the server's push (TODO(backend) in `app/sw.js/route.ts`).
 */
export async function notifyLocally(notice: LocalNotice): Promise<void> {
  if (notificationState() !== "granted" || document.visibilityState === "visible") return;
  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration(`${BASE_PATH}/`) : undefined;
  const options = { body: notice.body, tag: notice.tag, data: { url: `${BASE_PATH}${notice.url}` } };
  if (registration) await registration.showNotification(notice.title, options);
  else new Notification(notice.title, options);
}
