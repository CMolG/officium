import raw from "./agents-data.json";

/**
 * The first-party figures of `/officium/agents` and of its `data.json` (JAVA-2040): the operation catalog from
 * Officium's own `discover` and the board figures from `metrics.get` on Javadaba's board, both dated. The file is
 * written by `scripts/build-agents-data.mjs` and never by hand.
 */
export type AgentsData = typeof raw;

export const AGENTS_DATA: AgentsData = raw;

/** The page's address, with its data, as the sitemap, the guide link and the tests name them. */
export const AGENTS_PATH = "/agents";
export const AGENTS_URL = "https://javadaba.com/officium/agents";
export const AGENTS_DATA_URL = `${AGENTS_URL}/data.json`;

/** "2026-10-05" as "October 5, 2026", in the page's one language. */
export function longDate(isoDay: string): string {
  return new Date(`${isoDay}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
