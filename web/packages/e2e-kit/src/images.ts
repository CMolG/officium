/*
 * Image modules, for specs that load source files in Node.
 *
 * `@javadaba/brand`'s doodles import their drawings as `.webp` modules, which Next turns into static
 * assets and Node cannot parse. A Playwright spec that only runs logic (a "units" spec) but reaches the UI
 * barrel through a repository or a toolbar dies on the first drawing, and takes the whole run down with
 * it: Officium's suite could not even start on the control branch until its config carried this hook
 * itself. Nothing in such a spec draws an image, so the hook hands back what Next would: an object with
 * a source and a size.
 *
 * Import it for its effect, first thing in `playwright.config.ts` (Playwright loads the config in the
 * same process as the specs, so the hook is in place before any of them):
 *
 *   import "@javadaba/e2e-kit/images";
 */
import { createRequire } from "node:module";

/** The formats `next/image` and the brand package import as modules. */
export const IMAGE_EXTENSIONS = [".webp", ".png", ".jpg", ".jpeg", ".gif", ".avif", ".svg"] as const;

type Loader = (module: NodeJS.Module, filename: string) => void;

/** Registers the loader on every image extension that has none; returns the extensions it added. */
export function registerImageModules(extensions: Record<string, Loader | undefined> = createRequire(import.meta.url).extensions): string[] {
  const added: string[] = [];
  for (const extension of IMAGE_EXTENSIONS) {
    if (extensions[extension]) continue;
    extensions[extension] = (module, filename) => {
      module.exports = { __esModule: true, default: { src: filename, width: 1, height: 1 } };
    };
    added.push(extension);
  }
  return added;
}

registerImageModules();
