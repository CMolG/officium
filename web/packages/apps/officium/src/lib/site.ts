/**
 * This app's public URL. `metadataBase` and any canonical resolve against it. Same contract as
 * `packages/apps/curriculum/src/lib/site.ts` -- see that file's comment for why the basePath is
 * part of the value and not stripped.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://javadaba.com/officium";

/** The path prefix this zone is served under, or `""` when it is standalone (dev, :3016). */
export const BASE_PATH = process.env.OFFICIUM_BASE_PATH ?? "";
