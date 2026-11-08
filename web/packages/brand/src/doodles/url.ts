import type { DoodleName } from "./catalog";
import { DOODLE_IMAGES } from "./images";
import type { ImageModule } from "./image-module";

/** The URL out of a static import, in a Next build (`{ src }`) and under vitest (a bare string). */
export function doodleSrc(image: ImageModule): string {
  return typeof image === "string" ? image : image.src;
}

/**
 * A drawing's fingerprinted URL, for what an `<img>` cannot do: `shape-outside: url(...)`, a CSS
 * background, a preload. Prefer `<Doodle>`.
 */
export function doodleUrl(name: DoodleName): string {
  return doodleSrc(DOODLE_IMAGES[name]);
}

/** Intrinsic height over width, 1 when the bundler gave only a URL. */
export function doodleAspect(name: DoodleName): number {
  const image = DOODLE_IMAGES[name];
  return typeof image === "string" || !image.width ? 1 : image.height / image.width;
}
