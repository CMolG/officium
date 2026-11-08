/**
 * The one place a zone's `basePath` is resolved (JAVA-102).
 *
 * On the web Next applies it for us: `<Link href="/app">` inside Fabula renders `/fabula/app`,
 * and `usePathname()` answers `/app`. On Android there is no basePath — each app IS its own
 * navigator — but the URLs still have to be the product's URLs: an App Link to
 * `https://javadaba.com/fabula/app?book=1` must open Fabula's `/app` screen with `book=1`
 * (`doc://contracts/desktop-deeplinks`). These two functions are that mapping, both ways,
 * and nothing else in a screen ever touches a basePath.
 */

const normalize = (basePath: string) => (basePath === "/" ? "" : basePath.replace(/\/+$/, ""));

/**
 * The in-app route an incoming URL opens, or `null` when the URL belongs to another zone (the
 * system then hands it to the browser instead). Keeps the query and the hash.
 */
export function appPathFromUrl(url: string, basePath: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url, "https://javadaba.com");
  } catch {
    return null;
  }
  const base = normalize(basePath);
  const { pathname } = parsed;
  if (base && pathname !== base && !pathname.startsWith(`${base}/`)) return null;
  const inside = pathname.slice(base.length) || "/";
  return `${inside}${parsed.search}${parsed.hash}`;
}

/** The public URL of an in-app route: what a share sheet or a copied link carries. */
export function webUrlFor(path: string, basePath: string, origin = "https://javadaba.com"): string {
  const base = normalize(basePath);
  const route = path.startsWith("/") ? path : `/${path}`;
  return `${origin.replace(/\/+$/, "")}${base}${route === "/" && base ? "" : route}`;
}
