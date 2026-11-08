import { shareTraceIncludes } from "@javadaba/brand/share/trace";
import { withComponentStamps } from "@javadaba/ui/next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = dirname(fileURLToPath(import.meta.url));
// Officium is a member of the root pnpm workspace, same reason as curriculum/aura/tributa: its
// `next` lives symlinked in the root's store, three levels up (packages/apps/officium ->
// packages/apps -> packages -> root). Turbopack does not resolve files outside its `root`.
const workspaceRoot = dirname(dirname(dirname(projectRoot)));

// ADR 0001: under the Javadaba domain, Officium mounts at /officium (Multi-Zones), e.g.
// OFFICIUM_BASE_PATH="/officium". Unset (standalone dev, :3016) -> no prefix.
const basePath = process.env.OFFICIUM_BASE_PATH || undefined;

// Officium Local (the self-hosted edition): one owner, no ecosystem login. A build-time flag, like the memory backend's.
const isLocal = process.env.NEXT_PUBLIC_OFFICIUM_EDITION === "local";


const nextConfig: NextConfig = {
  // React Compiler (ADR 0007), on by default across the ecosystem's Next projects.
  reactCompiler: true,
  devIndicators: false,
  /*
   * JDB-226, found by hand: `next start`'s DEFAULT `compress: true` gzips every response --
   * including a proxied/rewritten one, `/api/officium/v1/projects/{id}/events` (SSE) included.
   * Node's gzip stream buffers to fill its window before flushing a chunk, so a real browser
   * (which always sends `Accept-Encoding: gzip`, unlike a bare `curl`) opened the connection
   * fine and then received NOTHING: no `ready`, no `card.created`, nothing -- confirmed with
   * `Content-Encoding: gzip` present hitting this app's own `:3117` and ABSENT hitting
   * `javadaba-api` on `:18088` directly with the same `Accept-Encoding` header, so the
   * compression is added here, not by Quarkus. Production doesn't need Next to compress at all
   * -- Traefik's `compression@file` middleware already does it in front of every miniapp
   * (`ops/prod/docker-compose.apps.yml`) -- so turning this off costs nothing and fixes the
   * live channel for anyone running `next start` locally or in CI.
   */
  compress: false,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  // Production images ship `.next/standalone` only (JAVA-909): tracing runs from the workspace root so the
  // workspace packages and their dependencies are traced, not copied whole.
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  // The link previews read their fonts, the robots strip and the doodles' PNGs from the brand package by
  // path (`@javadaba/brand/share`): a standalone deploy that renders a card on demand needs them traced.
  outputFileTracingIncludes: shareTraceIncludes(projectRoot, workspaceRoot),
  turbopack: {
    root: workspaceRoot,
    // JAVA-1667: the memory build resolves `memory-backend.memory.ts` for `memory-backend.ts`, so the
    // fake backend stays out of production chunks. The list replaces the default, so it keeps the defaults.
    ...(process.env.NEXT_PUBLIC_OFFICIUM_BACKEND === "memory"
      ? { resolveExtensions: [".memory.tsx", ".memory.ts", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"] }
      : {}),
  },
  async redirects() {
    // Local has no product page or landing to show: the tool is the front door.
    const localDoors = isLocal
      ? [
          { source: "/", destination: "/app", permanent: false },
          { source: "/landing", destination: "/app", permanent: false },
        ]
      : [];
    // JAVA-519: a project's roles moved from its own views to the workspace's settings. Bookmarks
    // of the old address keep working (`interface-psychology.md` point 8). JAVA-1626 moved every
    // settings address under /app/configuration; each old one lands on its new page in one hop.
    return [
      ...localDoors,
      { source: "/app/p/:projectId/roles", destination: "/app/configuration/p/:projectId/work-profile", permanent: true },
      { source: "/app/settings/roles", destination: "/app/configuration/roles", permanent: true },
      { source: "/app/settings/roles/r/:roleId", destination: "/app/configuration/roles/r/:roleId", permanent: true },
      { source: "/app/settings/roles/m/:modId", destination: "/app/configuration/roles/m/:modId", permanent: true },
      { source: "/app/settings/roles/:projectId", destination: "/app/configuration/p/:projectId/work-profile", permanent: true },
      { source: "/app/settings/categories", destination: "/app/configuration/categories", permanent: true },
      { source: "/app/settings/categories/:categoryId", destination: "/app/configuration/categories/:categoryId", permanent: true },
      { source: "/app/organization", destination: "/app/configuration/organization", permanent: true },
      { source: "/app/settings/github/:projectId", destination: "/app/configuration/p/:projectId/integrations", permanent: true },
      { source: "/app/settings/docs/:projectId", destination: "/app/configuration/p/:projectId/documentation", permanent: true },
      { source: "/app/connect", destination: "/app/configuration/integrations", permanent: true },
      { source: "/app/configuration/connect", destination: "/app/configuration/integrations", permanent: true },
      { source: "/app/configuration/p/:projectId/definition-of-done", destination: "/app/configuration/p/:projectId/work-rules", permanent: true },
      // JAVA-1600: System design is an entry of Systema; its old address keeps its shape and its query.
      { source: "/app/p/:projectId/system-design", destination: "/app/p/:projectId/systema/system-design", permanent: true },
    ];
  },
  async rewrites() {
    // Local: `/api/*` goes through a route handler that adds the owner's token server-side
    // (`app/local-api/[...path]/route.ts`), because a rewrite cannot add a header to the request it forwards.
    if (isLocal) return [{ source: "/api/:path*", destination: "/local-api/:path*" }];
    // Same-origin /api/* in standalone dev; in production Traefik already serves /api
    // same-origin (ADR 0001).
    const api = process.env.JAVADABA_API_PROXY_TARGET ?? "http://localhost:8088";
    // JAVA-890: a human card's form is filled in Quaestio's own page, `/quaestio/f/{slug}`, which
    // Traefik serves same-origin in production. Standalone dev has no Traefik, so it goes to Quaestio's
    // dev server the way the landing's does (that one runs with QUAESTIO_BASE_PATH=/quaestio).
    const quaestio = process.env.QUAESTIO_DEV_ORIGIN ?? "http://localhost:3009";
    return [
      { source: "/api/:path*", destination: `${api}/:path*` },
      { source: "/quaestio/:path*", destination: `${quaestio}/quaestio/:path*`, basePath: false as const },
    ];
  },
};

export default withComponentStamps(nextConfig);
