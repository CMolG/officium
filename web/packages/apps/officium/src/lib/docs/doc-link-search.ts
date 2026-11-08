import { MEMBER_SCHEME, type LinkTarget } from "@javadaba/rich-text";

import type { Member } from "../backlog/types";

const MAX_RESULTS = 8;

/**
 * The pages `[[` and `@` offer (JAVA-796), filtered in memory from the titles the tree already
 * holds: no request per keystroke. A title that starts with the query comes before one that only
 * contains it; the page being edited is never offered as a link to itself.
 */
export function searchPages(titles: ReadonlyMap<string, string>, query: string, current: string): LinkTarget[] {
  const q = query.trim().toLowerCase();
  const matches = [...titles]
    .filter(([path, title]) => path !== current && (!q || title.toLowerCase().includes(q) || path.includes(q)))
    .sort(([, a], [, b]) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)) || a.localeCompare(b));
  return matches.slice(0, MAX_RESULTS).map(([path, title]) => ({ href: `doc://${path}`, title, detail: path }));
}

/**
 * How a member is named in a page: their display name, or the part before the `@` when that name
 * is an email address, so an address is never copied into a page (`[@Name](member://<accountId>)`).
 */
export function mentionName(member: Pick<Member, "name" | "email">): string {
  const name = member.name.trim() || member.email;
  return name.includes("@") ? name.slice(0, name.indexOf("@")) : name;
}

/** The members `@` offers, by name. */
export function searchMembers(members: readonly Member[], query: string): LinkTarget[] {
  const q = query.trim().toLowerCase();
  return members
    .map((member) => ({ member, name: mentionName(member) }))
    .filter(({ name }) => !q || name.toLowerCase().includes(q))
    .slice(0, MAX_RESULTS)
    .map(({ member, name }) => ({ href: `${MEMBER_SCHEME}${member.accountId}`, title: name, detail: "Member" }));
}
