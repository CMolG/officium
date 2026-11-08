import localFont from "next/font/local";

/*
 * fonts.ts — the ecosystem's VOICE. A single declaration for every app.
 *
 * Before the "Harmony" sprint there were five different type stacks and none of them
 * was an actual decision: the landing and Aura carried all five brand families; Sonus
 * and Fabula were still on **Geist, `create-next-app`'s default font**; Tributa,
 * Curriculum and Quaestio only had a sans body face; and Creatio declared none (system-ui,
 * so the app looks different on macOS and on Windows). The `body` role itself changed family
 * on 2026-09-28, when an A/B on Officium's product page settled it on Montserrat (JAVA-252).
 *
 * Typography is the thing that's most noticeable and the cheapest to unify: two
 * products with the same palette and a different font read as two different
 * companies.
 *
 * ## Three families, five roles (display, kicker, body, italic, hand)
 *
 * The ecosystem ships three typefaces and no more (owner decision, 2026-10-24, JAVA-1861):
 * Montserrat, Doto and Covered By Your Grace. Space Mono (kicker), Instrument Serif (serif),
 * Geist and Geist Mono (the desktop), Inter (dossier) and Roboto were folded into Montserrat.
 *
 * | Role | Family | What it's for |
 * |---|---|---|
 * | `display` | Doto | Titles, product names, numbers. The brand's voice. Never under 20px: the dots fall apart. |
 * | `kicker` | Montserrat 700, capitals | Eyebrows, column heads and call-to-action labels: 11px, +16% tracking. |
 * | `body` | Montserrat | All the text that's actually read. It's 90% of the ecosystem. |
 * | `italic` | Montserrat italic | The line that breaks the rhythm: the question, the quote, the book. |
 * | `serif` | Montserrat (the body face) | Alias of `body`, kept for the callers that still ask for it. |
 * | `hand` | Covered By Your Grace | LIMITED by contract to three uses. See below. |
 *
 * **The kicker and the italic have no face of their own** (Quiet Bento, Lib-Foundations § 04): the
 * kicker is the body face at 700 in capitals (`tokens.css` points `--font-jd-kicker` at it) and the
 * italic role is the body family's italic cut, which every `jdBody` call already ships. The italic
 * "kicker" family (`jdKicker`) that told metadata apart by its slant is gone.
 *
 * **The handwritten font writes in the margin** (Lib-Foundations § 04): notes tilted 3 to 5 degrees,
 * the free-to-cite line, annotations on scenes. 30px and up, never in paragraphs, never in
 * navigation or in a `<label>`, and it only repeats what the page already says, so screen readers
 * skip it (`aria-hidden`). If every button carries it, it stops meaning anything.
 *
 * ## How it's used
 *
 * ```tsx
 * import { jdFonts } from "@javadaba/ui/fonts";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en" className={jdFonts}>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 *
 * The variables it publishes (`--font-jd-*-src`) are what `tokens.css` consumes to
 * resolve `--font-jd-display`, `--font-jd-body`, etc. An app that doesn't mount this
 * degrades to the system stacks without breaking, which is the correct behavior for an
 * external app (the system is mandatory inside `packages/apps/*`, opt-in outside it).
 *
 * ## Why next/font instead of a shared `@font-face`
 *
 * `next/font` self-hosts and preloads: zero requests to Google at runtime and zero CLS
 * from font swapping. Declaring them once here instead of once per app also keeps each
 * app from requesting different subsets and weights of the SAME family, which is
 * duplicate traffic the user pays for twice when navigating between two products.
 *
 * ## Why the files are vendored (`next/font/local`, not `next/font/google`)
 *
 * `next/font/google` downloads the fonts AT BUILD TIME, so every build depended on Google
 * answering the way Turbopack expects. It doesn't always: Google sometimes serves a family's
 * files as `/l/font?kit=...&skey=...` URLs, whose `&` breaks Turbopack's one-entry font query
 * ("next/font/google queries have exactly one entry", vercel/next.js#99114, still open on
 * 16.3.6). That failed Adiutor's build on Doto with no change of ours (JAVA-210).
 *
 * So the woff2 files live in `./font-files/`, fetched once from Google's CSS with each
 * family's OFL-1.1 licence next to them, and the output is the one Google's CSS produced:
 *
 * - **One call per subset**, each with Google's `unicode-range` and all declaring the SAME
 *   `font-family` through `declarations`, so a subset is only downloaded when a page has a
 *   character in its range. Latin goes LAST: where two ranges overlap, the last face wins.
 * - **Only the Latin call** preloads, carries the metric-adjusted fallback and publishes the
 *   CSS variable (`--font-jd-body-src: "jdBody", "jdBody Fallback"`).
 * - **The shared family is the Latin call's const name** (`jdBody`, `jdDisplay`...). Turbopack
 *   builds the variable's stack from the const, ignoring `declarations`; webpack takes it from
 *   `declarations`. Only when the two are the same name do both point at the declared faces.
 *   Adiutor's e2e fails if a variable ever names a family no face declares.
 * - The other calls exist for the `@font-face` they emit; nothing reads their constants.
 * - **Montserrat has no Greek** (Google ships cyrillic-ext, cyrillic, vietnamese, latin-ext and
 *   latin only), so Greek text in the body role falls back to the system face. The previous body
 *   face carried greek and greek-ext; nothing in the ecosystem publishes Greek copy today.
 *
 * Refreshing a family means re-fetching its files for the same subsets and checking that the
 * built CSS still lists every range. A build no longer touches the network for fonts.
 */

const jdBodyCyrillicExt = localFont({
  src: [
    { path: "./font-files/montserrat-cyrillic-ext.woff2", weight: "100 900", style: "normal" },
    { path: "./font-files/montserrat-italic-cyrillic-ext.woff2", weight: "100 900", style: "italic" },
  ],
  declarations: [
    { prop: "font-family", value: "jdBody" },
    { prop: "unicode-range", value: "U+0460-052F, U+1C80-1C8A, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F" },
  ],
  preload: false,
  adjustFontFallback: false,
  display: "swap",
});

const jdBodyCyrillic = localFont({
  src: [
    { path: "./font-files/montserrat-cyrillic.woff2", weight: "100 900", style: "normal" },
    { path: "./font-files/montserrat-italic-cyrillic.woff2", weight: "100 900", style: "italic" },
  ],
  declarations: [
    { prop: "font-family", value: "jdBody" },
    { prop: "unicode-range", value: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116" },
  ],
  preload: false,
  adjustFontFallback: false,
  display: "swap",
});

const jdBodyVietnamese = localFont({
  src: [
    { path: "./font-files/montserrat-vietnamese.woff2", weight: "100 900", style: "normal" },
    { path: "./font-files/montserrat-italic-vietnamese.woff2", weight: "100 900", style: "italic" },
  ],
  declarations: [
    { prop: "font-family", value: "jdBody" },
    { prop: "unicode-range", value: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB" },
  ],
  preload: false,
  adjustFontFallback: false,
  display: "swap",
});

const jdBodyLatinExt = localFont({
  src: [
    { path: "./font-files/montserrat-latin-ext.woff2", weight: "100 900", style: "normal" },
    { path: "./font-files/montserrat-italic-latin-ext.woff2", weight: "100 900", style: "italic" },
  ],
  declarations: [
    { prop: "font-family", value: "jdBody" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" },
  ],
  preload: false,
  adjustFontFallback: false,
  display: "swap",
});

const jdBody = localFont({
  src: [
    { path: "./font-files/montserrat-latin.woff2", weight: "100 900", style: "normal" },
    { path: "./font-files/montserrat-italic-latin.woff2", weight: "100 900", style: "italic" },
  ],
  declarations: [
    { prop: "font-family", value: "jdBody" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
  variable: "--font-jd-body-src",
  display: "swap",
});

const jdDisplayLatinExt = localFont({
  src: "./font-files/doto-latin-ext.woff2",
  weight: "100 900",
  declarations: [
    { prop: "font-family", value: "jdDisplay" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" },
  ],
  preload: false,
  adjustFontFallback: false,
  display: "swap",
});

const jdDisplay = localFont({
  src: "./font-files/doto-latin.woff2",
  weight: "100 900",
  declarations: [
    { prop: "font-family", value: "jdDisplay" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
  variable: "--font-jd-display-src",
  display: "swap",
});

const jdHandLatinExt = localFont({
  src: "./font-files/covered-by-your-grace-latin-ext-400.woff2",
  weight: "400",
  declarations: [
    { prop: "font-family", value: "jdHand" },
    { prop: "unicode-range", value: "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF" },
  ],
  preload: false,
  adjustFontFallback: false,
  display: "swap",
});

const jdHand = localFont({
  src: "./font-files/covered-by-your-grace-latin-400.woff2",
  weight: "400",
  declarations: [
    { prop: "font-family", value: "jdHand" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
  variable: "--font-jd-hand-src",
  display: "swap",
});

/** All three variables together. Goes on the `<html>` (or `<body>`) of the root layout. */
export const jdFonts = [
  jdBody.variable,
  jdDisplay.variable,
  jdHand.variable,
].join(" ");

/**
 * The individual families, in case an app needs to apply just one (e.g. mounting only
 * the body font on a form-filling surface that doesn't carry the brand).
 */
export const jdFontFamilies = {
  body: jdBody,
  display: jdDisplay,
  hand: jdHand,
};
