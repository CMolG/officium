#!/usr/bin/env node
/*
 * Exports the Javadaba kid's drawings into src/doodles/{webp,png} with TRANSPARENCY (wave 7, MIG-A03).
 *
 *   node packages/brand/scripts/export-doodles.mjs "<folder of the owner's masters>"
 *
 * The folder is the collection's `procesados/` (Kobayashi Shin): `png/<name>.png`, greyscale ink on a white
 * ground, 1254 px. The owner's `optimize_icons.py` cleans and quantizes them; this step turns the ground
 * into alpha, so a drawing sits on a photograph, a card or a dark surface exactly as the design shows it:
 *
 *   alpha = 255 - grey, color = black      (the ink's anti-aliasing becomes the edge's alpha)
 *
 * It writes `webp/<name>.webp` (lossless, original size) and `png/<name>.png` (420 px, palettized, for
 * Satori, which cannot read WebP). 25 of the 36 kid drawings are named by the design's own word and not by
 * the master's file name (`greeting.png` is `wave`): RENAMES is the only place that says so, and it
 * runs here, at export, never at runtime. Roles keep their file names.
 */
import { mkdir, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RENAMES = {
  greeting: "wave", crossed_arms: "confident", ready: "salute", thinking: "think", stunned: "dizzy",
  drinking_coffee: "mug", shy: "eager", surprised: "oh", shush: "shh", amazed: "wow", mindblown: "amazed",
  nervous: "oops", sigh: "phew", confused: "huh", sleeping: "sleepy", angry: "grumpy", crying: "cry",
  happy: "glad", laughing: "laugh", thumbsup: "like", thumbsdown: "dislike", pointing: "point",
  celebrating: "yay", clapping: "clap", drinking_pina_colada: "vacation",
};
const OUT = resolve(fileURLToPath(new URL("../src/doodles", import.meta.url)));
const PNG_SIDE = 420;

async function inkOnTransparent(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i++) rgba[i * 4 + 3] = 255 - data[i];
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
}

const source = process.argv[2];
if (!source) {
  console.error('usage: export-doodles.mjs "<procesados folder>"');
  process.exit(1);
}
await mkdir(join(OUT, "webp"), { recursive: true });
await mkdir(join(OUT, "png"), { recursive: true });
const files = (await readdir(join(source, "png"))).filter((f) => f.endsWith(".png")).sort();
for (const file of files) {
  const old = file.slice(0, -4);
  const name = RENAMES[old] ?? old;
  const ink = await inkOnTransparent(join(source, "png", file));
  await ink.clone().webp({ lossless: true, effort: 6 }).toFile(join(OUT, "webp", `${name}.webp`));
  await ink.clone().resize(PNG_SIDE, PNG_SIDE).png({ palette: true, colours: 48, compressionLevel: 9 }).toFile(join(OUT, "png", `${name}.png`));
}
console.log(`${files.length} drawings exported to ${OUT}`);
