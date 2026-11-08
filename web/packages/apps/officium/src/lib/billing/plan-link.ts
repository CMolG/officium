/**
 * Where a locked editor's one upgrade action goes: the account's plan tab (card://JAVA-1007, JAVA-962). A plain link
 * in the page, not Next's `Link`: the landing is another zone.
 */
export function planHref(lookupKey: string, extras: Record<string, string> = {}): string {
  return `/account?${new URLSearchParams({ tab: "plan", plan: lookupKey, ...extras }).toString()}`;
}
