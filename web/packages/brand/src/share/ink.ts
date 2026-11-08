import { accentFor } from "../accents";
import { readableAccent } from "../chroma";
import { brandEntry } from "../registry";
import { TOOLS, TOOL_CATEGORIES } from "../tools";

/*
 * SHARE_INK: the product's accent where it must be read as text on the card, the wordmark's dot and
 * the accent phrase. 4.5:1 on its ground, so these are the design's values for the products that
 * have a card (Library 18, "Product by product"); any other slug is derived from its accent the
 * same way (`readableAccent` at 4.5:1), and a tool takes its category's color.
 */
const SHARE_INK: Readonly<Record<string, string>> = {
  officium: "#4F46E5",
  "cibus-iter": "#A70003",
  curriculum: "#6D4FD6",
  album: "#B25490",
  aura: "#1F7A8C",
  oleum: "#B81AA3",
  creatio: "#D6334E",
  javadaba: "#4F46E5",
  "javadaba-os": "#2F5EA8",
  developers: "#B50E75",
  fabula: "#A23CB0",
  fluxor: "#6B5D3E",
  theatrum: "#C2414A",
  tributa: "#3F4FC4",
  quaestio: "#A94A8F",
  adiutor: "#B4442E",
  gymnasium: "#C2410C",
  sonus: "#D13B3B",
  oeconomicis: "#8A6D0B",
  agora: "#475569",
};

const FALLBACK = "#4F46E5";

/** The product's ink on a light card. */
export function shareInk(slug: string, ground = "#FFFFFF"): string {
  const known = SHARE_INK[slug];
  if (known) return known;
  const tool = TOOLS[slug];
  if (tool) return readableAccent(TOOL_CATEGORIES[tool.category].color, ground, 4.5);
  const accent = accentFor(slug);
  return accent ? readableAccent(accent.mid, ground, 4.5) : FALLBACK;
}

/** The product's seal colors, light to dark on its dark card: the tile's gradient and the bar. */
export function shareGradient(slug: string): string[] {
  const glass = brandEntry(slug)?.glass;
  if (glass?.length) return [...glass].reverse();
  const accent = accentFor(slug);
  return accent ? [accent.start, accent.mid, accent.end] : ["#98F1FF", "#ADA9D2", "#AEAFF2"];
}

/** The dot and the accent phrase on the dark card: the seal's first color, light enough for black. */
const SHARE_INK_DARK: Readonly<Record<string, string>> = { album: "#FCE9AA" }; // canvas (JAVA-2087)

export function shareInkOnDark(slug: string): string {
  if (SHARE_INK_DARK[slug]) return SHARE_INK_DARK[slug];
  const gradient = shareGradient(slug);
  return gradient[gradient.length - 1]!;
}
