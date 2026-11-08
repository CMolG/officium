import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { DoodleName } from "./catalog";

/*
 * The drawings for a renderer that cannot read WebP: `next/og`'s ImageResponse (Satori), which is
 * what every `opengraph-image.tsx` and link preview draws with. Server only, hence its own entry
 * point: `@javadaba/brand/doodles/og`.
 *
 * The PNGs in `./png` are the same 91 drawings at 420 px (a share card draws them at 300 at most),
 * palettized with their alpha (black ink on transparency, like the WebPs), about 20 KB each. They are read from disk the way the blog's Doto font
 * is, by walking up from the app's working directory to the monorepo's `packages/brand`; a share
 * image is prerendered at build time, where that tree is always there.
 */
const PNG_DIR = join("packages", "brand", "src", "doodles", "png");
const cache = new Map<DoodleName, string>();

function pngDir(): string {
  for (let dir = resolve(process.cwd()); ; dir = dirname(dir)) {
    const candidate = join(dir, PNG_DIR);
    if (existsSync(candidate)) return candidate;
    if (dirname(dir) === dir) throw new Error(`@javadaba/brand: ${PNG_DIR} not found above ${process.cwd()}`);
  }
}

/** A `data:` URI for `<img src>` inside an ImageResponse: `<img src={await doodlePngDataUri("wave")} />`. */
export async function doodlePngDataUri(name: DoodleName): Promise<string> {
  const hit = cache.get(name);
  if (hit) return hit;
  const bytes = await readFile(join(pngDir(), `${name}.png`));
  const uri = `data:image/png;base64,${bytes.toString("base64")}`;
  cache.set(name, uri);
  return uri;
}
