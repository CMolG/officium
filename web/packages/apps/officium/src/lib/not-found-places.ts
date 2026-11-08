import type { MachineLink, NotFoundPlace } from "@javadaba/ui";

import { BASE_PATH } from "./site";

/**
 * What Officium's 404 offers (Off-Shell, "Not found"; the standard of Web-NotFound 3.13): the product's own
 * places first, the house's after them, "tell us" last, and the files machines read. Officium had no
 * not-found page of its own until now. The places inside this zone carry its base path, because they are plain links
 * and a plain link does not get the router's prefix. The answer is the same whether a project was deleted or the person
 * never had access to it, so the page never says which.
 */
export const OFFICIUM_PLACES: NotFoundPlace[] = [
  { href: `${BASE_PATH}/app`, title: "Your projects", description: "Every board you belong to." },
  { href: `${BASE_PATH}/`, title: "Officium", description: "What it does and what it costs." },
  { href: "/developers/docs/officium-mcp/setup", title: "Officium MCP", description: "Connect an agent to your boards." },
  { href: "/catalogue", title: "App and API catalog", description: "Everything Javadaba publishes." },
];

export const OFFICIUM_TELL_US: NotFoundPlace = {
  href: "/contact",
  title: "Contact",
  description: "If a link of ours sent you here, tell us.",
};

export const OFFICIUM_MACHINE: MachineLink[] = [
  { href: "/sitemap.xml", label: "sitemap.xml" },
  { href: "/llms.txt", label: "llms.txt" },
  { href: "/agents.md", label: "agents.md" },
  { href: "/openapi.json", label: "openapi.json" },
];

/** The sentence under the heading: why, without saying which, and how many places follow. */
export function officiumNotFoundSentence(): string {
  return (
    "It may have been deleted, or you may not have access: the answer is the same either way. "
    + `These are the ${OFFICIUM_PLACES.length + 1} places worth trying instead.`
  );
}
