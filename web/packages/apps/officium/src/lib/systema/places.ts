/**
 * The Systema section (JAVA-1600): its entries and the addresses they answer at. Pure, so the nav, the layout, the
 * redirect and the unit spec read one table. A later card adds an entry here together with its page and its copy.
 */

export const SYSTEMA_ENTRIES = ["system-design"] as const;

export type SystemaEntry = (typeof SYSTEMA_ENTRIES)[number];

/** The address of the section: its first entry, which the bare address redirects to. */
export function systemaRoot(projectId: string): string {
  return `/app/p/${encodeURIComponent(projectId)}/systema`;
}

/** The address of one entry of the section. */
export function systemaPath(projectId: string, entry: SystemaEntry): string {
  return `${systemaRoot(projectId)}/${entry}`;
}

/** The entry an address is on, read back from its path; null on the bare root or on any other page. */
export function systemaEntry(pathname: string): SystemaEntry | null {
  const [, , , , section, entry] = pathname.split("/");
  if (section !== "systema") return null;
  return SYSTEMA_ENTRIES.find((e) => e === entry) ?? null;
}
