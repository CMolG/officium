import { encodeQr } from "./encode";

/*
 * A QR card as a file (Album's guest card first, Quaestio's form card since JAVA-2045): a title, the
 * sentence that says what to do, the QR, a help line and the short link. Plain black on white at a
 * fixed size, because it is printed: the on-screen card paints with theme tokens that mean nothing
 * outside the page.
 */

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The title broken into lines of at most `max` characters, at spaces; one long word keeps its own line. */
export function wrapTitle(title: string, max = 24): string[] {
  const lines: string[] = [];
  for (const word of title.trim().split(/\s+/)) {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.slice(0, 3);
}

/** The card as an SVG document, or null when the link cannot be a QR. `prompt` and `help` are the card's two sentences, in the screen's language. */
export function cardSvg(title: string, url: string, shortLink: string, prompt: string, help: string): string | null {
  const qr = encodeQr(url);
  if (!qr.ok) return null;
  const lines = wrapTitle(title);
  const heading = lines
    .map((line, index) => `<text x="540" y="${190 + index * 84}" text-anchor="middle" font-size="68" font-weight="700">${escape(line)}</text>`)
    .join("");
  const below = 190 + lines.length * 84;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1500" viewBox="0 0 1080 1500" font-family="Helvetica, Arial, sans-serif">`,
    `<rect width="1080" height="1500" fill="#ffffff"/>`,
    `<g fill="#000000">${heading}`,
    `<text x="540" y="${below + 60}" text-anchor="middle" font-size="52">${escape(prompt)}</text></g>`,
    `<svg x="170" y="${below + 120}" width="740" height="740" viewBox="0 0 ${qr.modules} ${qr.modules}" shape-rendering="crispEdges"><path d="${qr.path}" fill="#000000"/></svg>`,
    `<text x="540" y="${below + 940}" text-anchor="middle" font-size="40" fill="#000000">${escape(help)}</text>`,
    `<text x="540" y="${below + 1010}" text-anchor="middle" font-size="40" font-weight="700" fill="#000000">${escape(shortLink)}</text>`,
    `</svg>`,
  ].join("");
}
