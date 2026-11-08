/** Android is installed from the store and notifies through the system: none of this exists there. */

export type NotificationState = "unsupported" | "needs-install" | "default" | "denied" | "granted";

export interface PwaSnapshot {
  canInstall: boolean;
  installed: boolean;
  notifications: NotificationState;
}

export interface LocalNotice {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const NONE: PwaSnapshot = { canInstall: false, installed: false, notifications: "unsupported" };

export const startPwa = (): void => {};
export const subscribePwa = (_listener: () => void): (() => void) => () => {};
export const pwaSnapshot = (): PwaSnapshot => NONE;
export const pwaServerSnapshot = (): PwaSnapshot => NONE;
export const promptInstall = async (): Promise<boolean> => false;
export const askForNotifications = async (): Promise<NotificationState> => "unsupported";
export const notifyLocally = async (_notice: LocalNotice): Promise<void> => {};
