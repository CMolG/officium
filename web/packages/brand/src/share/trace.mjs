import { relative } from "node:path";

/*
 * `outputFileTracingIncludes` for an app that renders share cards (`@javadaba/brand/share/trace`).
 *
 * A card reads its fonts, its robots strip and the doodles' PNGs from `packages/brand/src` by path,
 * which tracing cannot follow. A prerendered card has them at build time; a card rendered on demand
 * (an unknown slug, a revalidated page) in a standalone deploy does not, and answers 500 unless the
 * folders are named here. Use it in `next.config`:
 *
 *   import { shareTraceIncludes } from "@javadaba/brand/share/trace";
 *   outputFileTracingIncludes: shareTraceIncludes(projectRoot, workspaceRoot),
 *
 * The key matches every `opengraph-image` route; the values are relative to the app, which is how
 * Next reads them.
 */
export function shareTraceFiles(projectRoot, workspaceRoot) {
  const brand = relative(projectRoot, `${workspaceRoot}/packages/brand/src`).split("\\").join("/");
  return [`${brand}/share/fonts/*`, `${brand}/share/art/*`, `${brand}/doodles/png/*`];
}

export function shareTraceIncludes(projectRoot, workspaceRoot) {
  return { "/**/opengraph-image*": shareTraceFiles(projectRoot, workspaceRoot) };
}
