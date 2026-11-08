/** Android's half of `presence-env.ts` (JAVA-1144): AppState reports visibility, so there is no page to hide. */

export type RecordedBeat = { kind: "beat"; visible: boolean; focused: boolean } | { kind: "close" };

let processDevice: string | null = null;

export function deviceId(): string {
  processDevice ??= globalThis.crypto.randomUUID();
  return processDevice;
}

export function deviceLabel(): string {
  return "Officium on Android";
}

export function sendClose(url: string): void {
  void fetch(url, { method: "POST", credentials: "include" });
}

export function onPageHide(): () => void {
  return () => {};
}

export function recordBeat(): void {}
