import type { MetadataRoute } from "next";
import { AGENTS_DATA, AGENTS_URL } from "@/lib/agents/agents-data";
import { SITE_URL } from "@/lib/site";

/**
 * Officium's own sitemap: `/officium/sitemap.xml` (`doc://contracts/app-surfaces`: the app
 * owns its own `/{slug}` surface and, per the pattern Curriculum already sets, its own sitemap).
 *
 * Two entries: `/officium` itself (JDB-228) and `/officium/agents` (JAVA-2040), the page for AI agents.
 * `/officium/app` is `noindex` (the desktop surface, per the surfaces contract) and never belongs here.
 * `/officium/app` also sits behind the landing's release gate; this page does not -- see the
 * product page's own comment for that distinction.
 *
 * The product page carries no `lastModified` (JAVA-503): its last change is not known, and the render time it
 * carried until 2026-10-02 is not one. The agents page does: its figures are a dated snapshot.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE_URL }, { url: AGENTS_URL, lastModified: AGENTS_DATA.generatedOn }];
}
