// For this package's own `tsc`: inside a Next app these come from `next/image-types/global`.
declare module "*.webp" {
  const image: { src: string; width: number; height: number };
  export default image;
}
