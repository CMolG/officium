import { renderFavicon } from "@javadaba/brand/favicon";

/*
 * The tab icon, drawn from the brand: the `officium` entry in `packages/brand/src/registry.ts`.
 *
 * A route handler and not the `icon.tsx` file convention, on purpose (JAVA-129): Turbopack
 * writes a GENERATED icon's `<link>` href without the basePath (`/icon?…` where it should be
 * `/officium/icon?…`; still so on Next canary, 2026-09-26), so the tab showed the landing's icon.
 * The `<link>` is declared in the root layout's `metadata.icons`, with the basePath written
 * out. `scripts/test/basepath-generated-icons.test.mjs` keeps the file convention away.
 */
export const dynamic = "force-static";

export function GET() {
  return renderFavicon("officium");
}
