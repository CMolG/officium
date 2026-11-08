/**
 * Which documentation page a link points at. The web twin of the API's `DocLinks` (JAVA-792, officium-api.md
 * §8.20): the reading view uses it to turn a link into a route, and the in-memory backend to answer
 * backlinks.
 */

/**
 * A `related` entry as a page of this project: the schema writes them relative to the page
 * (`./manage-sessions.md`), so they resolve against its folder and lose the `.md`. A `doc://`
 * reference is already a page path. Anything else (an outside URL) is not a page.
 */
export function relatedPagePath(pagePath: string, target: string): string | null {
  if (target.startsWith("doc://")) return target.slice("doc://".length).replace(/\.md$/, "") || null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("/")) return null;
  const parts = pagePath.split("/").slice(0, -1);
  for (const segment of target.replace(/\.md$/, "").split("/")) {
    if (segment === "." || !segment) continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.length ? parts.join("/") : null;
}

/**
 * A link in a page's text as a page of this project, or null to leave it a plain link. Only a
 * target that names a page does: the schema's `./other-page.md` (an anchor after it is dropped,
 * headings carry none) or a `doc://` reference. A bare `#section` or an outside URL is not one.
 */
export function bodyPagePath(pagePath: string, href: string): string | null {
  const target = href.replace(/#.*$/, "");
  return target.startsWith("doc://") || /\.md$/.test(target) ? relatedPagePath(pagePath, target) : null;
}

const DOC_REF = /doc:\/\/([a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)/g;
const MD_LINK = /\]\(([^)\s]+)\)/g;

/** Every page a text points at (a `doc://` reference outside a fenced block, or a link to a relative `.md`), once each. */
export function docRefs(pagePath: string, body: string): string[] {
  const found = new Set<string>();
  let fenced = false;
  for (const line of body.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    for (const match of line.matchAll(DOC_REF)) found.add(match[1]);
    for (const match of line.matchAll(MD_LINK)) {
      if (match[1].startsWith("doc://")) continue;
      const path = bodyPagePath(pagePath, match[1]);
      if (path) found.add(path);
    }
  }
  found.delete(pagePath);
  return [...found];
}
