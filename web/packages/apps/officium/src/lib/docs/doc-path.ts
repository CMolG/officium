/**
 * A documentation page's path, by the API's own rules (`DocPage.normalizePath`, officium-api.md
 * §8.7): lower-case segments of letters, digits and single hyphens, joined by `/`, at most 8 deep
 * and 200 characters. Surrounding slashes and upper case are forgiven; anything else is refused,
 * never rewritten. Checked here so a form can say what is wrong before anything is sent -- the API
 * still has the last word.
 */
const SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_PATH_LENGTH = 200;
const MAX_DEPTH = 8;

/** Where the documentation changelog lives (JAVA-132, officium-api.md §8.8). It is not a page, and
 *  the API refuses a page at this path (`reserved_doc_path`). */
export const CHANGELOG_PATH = "documentation/changelog";

/** Where the test-run history lives (JAVA-766, officium-api.md §8.12), reserved the same way. */
export const TEST_HISTORY_PATH = "documentation/test-history";

/** The sections of the page lifecycle (JAVA-793, officium-api.md §8.7): your unpublished drafts, the
 *  archive and the trash. Not pages either, so the API refuses a page at these paths. */
export const UNPUBLISHED_PATH = "documentation/unpublished";
export const ARCHIVE_PATH = "documentation/archive";
export const TRASH_PATH = "documentation/trash";

/** The pages you opened last (JAVA-799, officium-api.md §8.21): a section like the lifecycle's, so no page lives here. */
export const RECENT_PATH = "documentation/recent";

/** The project's templates (JAVA-801, officium-api.md §8.23): a section, so no page lives here either. */
export const TEMPLATES_PATH = "documentation/templates";
/** Full-text search over the pages (JAVA-800): a section, reserved the same way. */
export const SEARCH_PATH = "documentation/search";

/** What lives at each reserved path, for the `reserved_doc_path` message. */
export const RESERVED_DOC_PATHS: Readonly<Record<string, string>> = {
  [SEARCH_PATH]: "the search",
  [RECENT_PATH]: "your recent pages",
  [TEMPLATES_PATH]: "the templates",
  [CHANGELOG_PATH]: "the changelog",
  [TEST_HISTORY_PATH]: "the test history",
  [UNPUBLISHED_PATH]: "the unpublished drafts",
  [ARCHIVE_PATH]: "the archive",
  [TRASH_PATH]: "the trash",
};

/** Officium's own pages (JAVA-783, officium-api.md §8.15): one read-only set shown in every
 *  project under this prefix. The API refuses any write there (`builtin_doc_read_only`). */
export const BUILTIN_PREFIX = "officium";

export const BUILTIN_PATH_PROBLEM = `Pages under ${BUILTIN_PREFIX}/ are Officium's own documentation: choose another path.`;

/** Whether a normalized path is the built-in prefix or under it. */
export function isBuiltinDocPath(path: string): boolean {
  return path === BUILTIN_PREFIX || path.startsWith(`${BUILTIN_PREFIX}/`);
}

export const DOC_PATH_HINT ="Lower-case letters, digits and hyphens, with / between levels, like procedures/deploy.";

/** The path the API would store, or `null` when it would answer `invalid_doc_path`. */
export function normalizeDocPath(raw: string): string | null {
  const path = raw.trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  const segments = path.split("/");
  if (!path || path.length > MAX_PATH_LENGTH || segments.length > MAX_DEPTH) return null;
  return segments.every((segment) => SEGMENT.test(segment)) ? path : null;
}

/** A path segment suggested from a title: "Deploy to production" -> "deploy-to-production". */
export function slugFromTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
}

/** Everything above the last segment ("procedures/deploy" -> "procedures"), or "" at the root. */
export function parentOf(path: string): string {
  const at = path.lastIndexOf("/");
  return at === -1 ? "" : path.slice(0, at);
}

/**
 * Where a page created from a link lands (JAVA-796): under the page being edited, as the slug of
 * its title; beside it when that page is already 8 deep; `-2`, `-3`... when the path is taken.
 */
export function newPagePath(current: string, title: string, taken: ReadonlySet<string>): string {
  const slug = slugFromTitle(title) || "page";
  const parent = current.split("/").length >= MAX_DEPTH ? parentOf(current) : current;
  const base = parent ? `${parent}/${slug}` : slug;
  let candidate = base;
  for (let n = 2; taken.has(candidate) || RESERVED_DOC_PATHS[candidate] || isBuiltinDocPath(candidate); n += 1) {
    candidate = `${base}-${n}`;
  }
  return candidate;
}
