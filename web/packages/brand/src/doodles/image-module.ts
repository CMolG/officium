/**
 * What a static `import x from "./a.webp"` is: Next's bundlers give `{ src, width, height }`, and
 * vitest (vite) gives the URL as a bare string. `doodleSrc` is the only reader and takes both.
 */
interface ImageData {
  src: string;
  width: number;
  height: number;
}

export type ImageModule = ImageData | string;
