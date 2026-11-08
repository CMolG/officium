import type { MetadataRoute } from "next";

import { BASE_PATH } from "@/lib/site";

/*
 * Officium as an installed app (Off-Shell, "Officium on your phone and desktop", JAVA-1674): its own window and icon.
 * A file-convention route and not `public/manifest.json`, because a static file cannot know the basePath and its
 * start_url and icons would point outside /officium once the zone is mounted there (same as Tributa's).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Officium",
    short_name: "Officium",
    description: "A backlog your team and your AI agents work on together.",
    start_url: `${BASE_PATH}/app`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#fbfaf7",
    icons: [
      { src: `${BASE_PATH}/pwa-icon/192`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${BASE_PATH}/pwa-icon/512`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    categories: ["business", "productivity"],
  };
}
