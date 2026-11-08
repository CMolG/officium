import { renderAppleTouchIcon } from "@javadaba/brand/favicon";

/*
 * The iOS home-screen icon, drawn from the brand (JAVA-225): the `officium` entry in
 * `packages/brand/src/registry.ts`, at 180×180. A route handler and not the `apple-icon.tsx`
 * file convention, because Turbopack drops the basePath from a generated icon's `<link>`
 * (JAVA-129). The root layout links it with the basePath written out.
 */
export const dynamic = "force-static";

export function GET() {
  return renderAppleTouchIcon("officium");
}
