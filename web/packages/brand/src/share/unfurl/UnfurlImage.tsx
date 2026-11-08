import type { CSSProperties } from "react";

/** The card as a platform draws it: the 1200 x 630 image scaled into a box of the platform's width, cropped to cover. */
export function UnfurlImage({
  src,
  alt,
  width,
  height,
  style,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  style?: CSSProperties;
}) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ display: "block", width, height, objectFit: "cover", flex: "none", ...style }}
    />
  );
}
