/*
 * The body role is Montserrat on every surface that mounts `@javadaba/ui/fonts` (card://JAVA-252).
 * The kicker and italic roles have no face of their own (Quiet Bento): they are the same family.
 *
 * A computed `font-family` only says `jdBody`, the family every body face shares, so on its own it
 * cannot tell which FILE backs it: swapping the woff2 under `packages/ui/src/font-files/` changes
 * nothing a style query sees. Nor can the built file's name: Turbopack keeps the source name, webpack
 * (fluxor-web) hashes it away. What does tell is drawing: the vendored Latin file is loaded into the
 * page as a probe face, and a sample set in the text's own family must measure exactly what the
 * probe measures. A fallback, or any other face, lands pixels away.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { expect, type Locator, type Page } from "@playwright/test";

const FONT_FILES = join("packages", "ui", "src", "font-files");

/** The vendored file, found from the suite's own directory up to the workspace root. */
function vendoredFontBase64(file: string): string {
  const vendored = join(FONT_FILES, file);
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    const candidate = join(dir, vendored);
    if (existsSync(candidate)) return readFileSync(candidate).toString("base64");
    if (dirname(dir) === dir) throw new Error(`${vendored} not found above ${process.cwd()}`);
  }
}

/** Asserts `text` is set in `family`, drawn from the vendored `file` and from nothing else. */
async function expectHouseFace(text: Locator, family: string, file: string, name: string): Promise<void> {
  const measured = await text.evaluate(async (el, base64) => {
    const sample = "Hamburgefonstiv, quick jumps 0123456789";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    document.fonts.add(await new FontFace("jdHouseProbe", bytes, { weight: "100 900" }).load());
    const family = getComputedStyle(el).fontFamily;
    // Only the first family: the metric fallback is `local("Arial")`, which a Linux runner lacks,
    // and one face in `error` rejects a load over the whole stack.
    await document.fonts.load(`400 64px ${family.split(",")[0]}`, sample);
    const ctx = document.createElement("canvas").getContext("2d")!;
    const width = (stack: string) => {
      ctx.font = `400 64px ${stack}`;
      return ctx.measureText(sample).width;
    };
    return { family, text: width(family), probe: width("jdHouseProbe") };
  }, vendoredFontBase64(file));

  expect(measured.family.split(",")[0].trim().replace(/["']/g, ""), `family: ${measured.family}`).toBe(family);
  expect(Math.abs(measured.text - measured.probe), `${family} ${measured.text}px vs ${name} ${measured.probe}px`)
    .toBeLessThan(0.5);
}

/** Asserts `text` (the page's `<body>` by default) is set in the house body face, Montserrat. */
export async function expectHouseBodyFont(page: Page, text?: Locator): Promise<void> {
  await expectHouseFace(text ?? page.locator("body"), "jdBody", "montserrat-latin.woff2", "Montserrat");
}
