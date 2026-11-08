import type { PoppedOut } from "../../lib/shell/pop-out";

/** Android: nothing pops out. */
export function usePopOut(_title: string) {
  return { popped: null as PoppedOut | null, blocked: false, open: async () => {}, close: () => {} };
}
