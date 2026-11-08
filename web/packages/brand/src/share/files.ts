import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/*
 * Where the share card reads its files from. Server only.
 *
 * Satori reads fonts and pictures as bytes, so the card's fonts (`./fonts`) and art (`./art`) are
 * read from disk, the way the doodles' PNGs are (`../doodles/og.ts`): by walking up from the app's
 * working directory to the monorepo's `packages/brand/src/share`. A prerendered card finds the
 * tree at build time. A card rendered on demand in a standalone deploy needs the folder traced
 * into the output: `shareTraceFiles` in `./trace.mjs` is the list for `outputFileTracingIncludes`.
 */
const SHARE_DIR = join("packages", "brand", "src", "share");

function shareDir(): string {
  for (let dir = resolve(process.cwd()); ; dir = dirname(dir)) {
    const candidate = join(dir, SHARE_DIR);
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) throw new Error(`@javadaba/brand/share: ${SHARE_DIR} not found above ${process.cwd()}`);
  }
}

const cache = new Map<string, Promise<Buffer>>();

/** A file under the share folder, read once per process. */
export function shareFile(relative: string): Promise<Buffer> {
  const hit = cache.get(relative);
  if (hit) return hit;
  const read = readFile(join(shareDir(), relative));
  cache.set(relative, read);
  return read;
}

/** A PNG under the share folder as a `data:` URI for `<img src>` inside the card. */
export async function sharePngDataUri(relative: string): Promise<string> {
  return `data:image/png;base64,${(await shareFile(relative)).toString("base64")}`;
}
