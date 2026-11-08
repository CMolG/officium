import { shareFile } from "./files";

/*
 * The card's fonts: Montserrat and Doto only (the rules say so). Satori reads TTF, and a variable
 * font only at its default weight, so these are static instances cut from the Google Fonts
 * variable files (OFL, licenses beside them) and subset to Latin (Spanish accents and inverted
 * punctuation included, since Tributa's cards are in Spanish).
 *
 *   Montserrat 500    the one-line description
 *   Montserrat 600    the domain
 *   Montserrat 800    the headline and the kicker
 *   Montserrat 800 i  the accent phrase
 *   Doto 900          the wordmark (capitals, digits and punctuation only)
 */
export type ShareFont = { name: "Montserrat" | "Doto"; data: Buffer; weight: 500 | 600 | 800 | 900; style: "normal" | "italic" };

const FILES = [
  { name: "Montserrat", file: "Montserrat-Medium.ttf", weight: 500, style: "normal" },
  { name: "Montserrat", file: "Montserrat-SemiBold.ttf", weight: 600, style: "normal" },
  { name: "Montserrat", file: "Montserrat-ExtraBold.ttf", weight: 800, style: "normal" },
  { name: "Montserrat", file: "Montserrat-ExtraBoldItalic.ttf", weight: 800, style: "italic" },
  { name: "Doto", file: "Doto-Black.ttf", weight: 900, style: "normal" },
] as const;

export async function loadShareFonts(): Promise<ShareFont[]> {
  return Promise.all(
    FILES.map(async ({ name, file, weight, style }) => ({
      name,
      weight,
      style,
      data: await shareFile(`fonts/${file}`),
    })),
  );
}
