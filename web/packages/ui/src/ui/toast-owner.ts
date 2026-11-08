import { DEFAULT_TOAST_LABELS, type ToastLabels } from "./toast.shared";

/*
 * Which mounted surface draws the toast stack (JAVA-1620). The page's `ToastViewport` draws it, unless a
 * modal `Dialog` is open: the dialog then claims it and draws it inside itself, where its focus trap
 * reaches the toasts. The newest claim wins, and a claim is given back on unmount. The store is one
 * module-level state, so only the claimant draws it: each toast is painted and announced once.
 */
export interface ToastOwner {
  readonly token: object;
  readonly kind: "page" | "dialog";
  readonly labels: ToastLabels;
}

let owners: readonly ToastOwner[] = [];
const listeners = new Set<() => void>();

function publish(next: readonly ToastOwner[]) {
  owners = next;
  for (const listen of listeners) listen();
}

export function subscribeToastOwners(listen: () => void): () => void {
  listeners.add(listen);
  return () => {
    listeners.delete(listen);
  };
}

/** The claimant that draws the stack now: the last one claimed. */
export function currentToastOwner(): ToastOwner | null {
  return owners[owners.length - 1] ?? null;
}

/** The page's labels, which every surface draws with; the defaults when no page has a viewport. */
export function pageToastLabels(): ToastLabels {
  return owners.find((owner) => owner.kind === "page")?.labels ?? DEFAULT_TOAST_LABELS;
}

/** The page holder's token, or null. A second page viewport waits for it to release. */
export function pageToastHolder(): object | null {
  return owners.find((owner) => owner.kind === "page")?.token ?? null;
}

/**
 * Claims the stack for `token`. Idempotent: a token already holding it is left alone, and a page claim
 * waits while another page holds it (a second viewport renders nothing).
 */
export function claimToastOwner(token: object, kind: ToastOwner["kind"], labels: ToastLabels): void {
  if (owners.some((owner) => owner.token === token)) return;
  if (kind === "page" && owners.some((owner) => owner.kind === "page")) return;
  publish([...owners, { token, kind, labels }]);
}

export function releaseToastOwner(token: object): void {
  if (owners.some((owner) => owner.token === token)) publish(owners.filter((owner) => owner.token !== token));
}

export function setToastOwnerLabels(token: object, labels: ToastLabels): void {
  if (owners.some((owner) => owner.token === token))
    publish(owners.map((owner) => (owner.token === token ? { ...owner, labels } : owner)));
}
