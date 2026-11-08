/**
 * Who a product is for. B2C products are the owner's consumer line; a visitor does not see
 * them, an admin does (owner, 2026-10-18, JAVA-1577). The list lives here, in brand, because
 * the landing and web-os both read it and web-os cannot import the landing. Two lists would
 * diverge, which is what `accentFor` was written to end.
 *
 * A slug in neither list throws: whoever adds a product has to classify it.
 */
export type Audience = "b2b" | "b2c";

const B2C: ReadonlySet<string> = new Set([
  "javadaba-os",
  "sonus",
  "aura",
  "fabula",
  "gymnasium",
  "oleum",
  "cibus-iter",
  "album",
]);

const B2B: ReadonlySet<string> = new Set([
  "fluxor",
  "seo-brain",
  "tributa",
  "curriculum",
  "quaestio",
  "creatio",
  "oeconomicis",
  "officium",
  "adiutor",
  "email-editor",
  "theatrum",
  "societas",
  "agora",
]);

/** The audience of a catalog slug. Throws on a slug nobody classified. */
export function audienceFor(slug: string): Audience {
  if (B2C.has(slug)) return "b2c";
  if (B2B.has(slug)) return "b2b";
  throw new Error(
    `audienceFor: "${slug}" has no audience. Add it to packages/brand/src/audience.ts.`,
  );
}

/**
 * B2C products that a SIGNED-IN account sees in the landing's app lists (the home panel and the Javadaba
 * menu), not only an admin (owner, 2026-11-06, JAVA-2053). A visitor still sees none: the rest of the B2C
 * line stays admin-only. Naming the product here is the whole rule; nothing copies the lists.
 */
const SHOWN_TO_MEMBERS: ReadonlySet<string> = new Set(["album"]);

/** Who is looking: nobody (or a session still resolving), a signed-in account, or a platform admin. */
export type Viewer = "visitor" | "member" | "admin";

/**
 * May this viewer see the product in an app LIST? The one filter every list reads. B2B is for everyone, a
 * B2C product is an admin's, unless it is shown to members. Fails closed: callers pass `visitor` until the
 * session has resolved. A slug nobody classified throws, like `audienceFor`.
 */
export function listedForViewer(slug: string, viewer: Viewer): boolean {
  if (viewer === "admin") return true;
  if (audienceFor(slug) === "b2b") return true;
  return viewer === "member" && SHOWN_TO_MEMBERS.has(slug);
}

/** Non-throwing read for runtime code that may meet an id it has never heard of. */
export function isB2c(slug: string): boolean {
  return B2C.has(slug);
}
