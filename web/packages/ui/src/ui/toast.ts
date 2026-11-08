import { hasDom } from "@javadaba/sdk/platform";

import { createToastStore } from "./toast-store";
import type { ToastOptions } from "./toast.shared";

export type { ToastAction, ToastLabels, ToastOptions, ToastVariant } from "./toast.shared";

/*
 * toast: the non-blocking news of the ecosystem (JAVA-1620). It floats and expires; a reversible
 * action in place is `UndoNotice`'s job, which has no timer on purpose (WCAG 2.2.1). The page keeps
 * one store, and `ToastViewport` draws it.
 *
 * On the server it does nothing and returns "": a module-level store would be shared by every request.
 */

const store = createToastStore();

/** The store the viewport reads. Internal: an app uses `toast` and `ToastViewport` only. */
export { store as toastStore };

function raise(title: string, options: ToastOptions = {}): string {
  if (!hasDom()) return "";
  return store.enqueue(title, options);
}

export const toast = Object.assign(raise, {
  success: (title: string, options?: ToastOptions) => raise(title, { ...options, variant: "success" }),
  error: (title: string, options?: ToastOptions) => raise(title, { ...options, variant: "error" }),
  info: (title: string, options?: ToastOptions) => raise(title, { ...options, variant: "info" }),
  warning: (title: string, options?: ToastOptions) => raise(title, { ...options, variant: "warning" }),
  dismiss: (id?: string) => store.dismiss(id),
});
