import { doodlePngDataUri } from "../doodles/og";
import type { DoodleName } from "../doodles/catalog";
import { sharePngDataUri } from "./files";

/*
 * The card's raster pictures: a doodle or the robots strip, as a `data:` URI with its size read
 * from the PNG header, because Satori wants both dimensions on an `<img>` and the card places a
 * drawing by its width.
 */
export interface Picture {
  uri: string;
  /** Pixel size of the file. */
  width: number;
  height: number;
}

/** IHDR holds the size at bytes 16..24 of every PNG. */
function pictureOf(uri: string): Picture {
  const head = Buffer.from(uri.slice(uri.indexOf(",") + 1, uri.indexOf(",") + 45), "base64");
  return { uri, width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

export async function kidPicture(name: DoodleName): Promise<Picture> {
  return pictureOf(await doodlePngDataUri(name));
}

export async function stripPicture(): Promise<Picture> {
  return pictureOf(await sharePngDataUri("art/robots-at-work.png"));
}

/** A picture drawn `width` px wide, its height following the file's proportions. */
export function Pic({ picture, width }: { picture: Picture; width: number }) {
  const height = Math.round((width * picture.height) / picture.width);
  return <img src={picture.uri} width={width} height={height} alt="" style={{ width, height }} />;
}
