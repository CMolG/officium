import { shareAppIcons } from "./art";
import type { ShareHomeCard, ShareStyle } from "./spec";

/*
 * The home card of every product, as its own "Link previews" board draws it (Lib-Share "Product by
 * product", wave 7, MIG-A08). One line, the accent phrase, the kid and, where the board draws one, the
 * robots strip or the row of app seals: nothing else. The card is LIGHT unless a caller asks for the dark
 * one, which is for the dark places the owner chooses and draws no drawings.
 *
 * The words are the boards' own. Tributa's are Spanish (its visible text is), and its board marks them as
 * a proposal for the owner. A product's page-level cards (an item, an article, a private link) are not here:
 * they are the page's own words and live with the page.
 */

type HomeArt = "robots-at-work" | { icons: readonly string[]; size: number };

interface HomeBoard {
  /** Registry slug of the product the card belongs to (the tile, the colors, the mark). */
  product: string;
  /** How the board writes the wordmark when it is not the slug in capitals. */
  name?: string;
  headline: string;
  accent: string;
  kid: NonNullable<ShareHomeCard["kid"]>;
  art?: HomeArt;
  /** BCP 47 tag of the words, when it is not English. */
  lang?: "es";
}

const HOUSE_ICONS = ["fabula", "curriculum", "officium", "sonus", "fluxor"] as const;

export const SHARE_HOMES = {
  javadaba: { product: "javadaba", headline: "All your apps, one web desktop.", accent: "One free account.", kid: "wave", art: { icons: [...HOUSE_ICONS, "quaestio"], size: 76 } },
  "javadaba-os": { product: "javadaba-os", name: "JAVADABA OS", headline: "Your desktop. All your apps.", accent: "In one tab.", kid: "confident", art: { icons: HOUSE_ICONS, size: 76 } },
  developers: { product: "javadaba", name: "DEVELOPERS", headline: "Every public endpoint, with its status.", accent: "Call it today.", kid: "idea" },
  fabula: { product: "fabula", headline: "Write your book on real pages.", accent: "Then export it as EPUB.", kid: "think" },
  curriculum: { product: "curriculum", headline: "A free CV review.", accent: "See what the software sees.", kid: "confident" },
  officium: { product: "officium", headline: "A backlog your team and your AI agents work on together.", accent: "Vacation mode: ON.", kid: "vacation", art: "robots-at-work" },
  "officium-docs": { product: "officium", headline: "Officium docs: every page, in a tree.", accent: "Written with your board.", kid: "think" },
  fluxor: { product: "fluxor", name: "FLUXOR", headline: "A flow designer and harness for AI agents.", accent: "Runs in your browser.", kid: "point" },
  theatrum: { product: "theatrum", headline: "Turn a story into a shot plan for AI video.", accent: "Lights, prompt, action.", kid: "amazed" },
  album: { product: "album", headline: "Albums for a trip, a wedding or a year.", accent: "Everyone adds their photos.", kid: "love" },
  tributa: { product: "tributa", headline: "Facturación sencilla para autónomos y pymes.", accent: "Sin sustos cada trimestre.", kid: "okay", lang: "es" }, // lang:es
  quaestio: { product: "quaestio", headline: "Build forms and read the answers as they land.", accent: "Ask well, decide better.", kid: "think" },
  creatio: { product: "creatio", headline: "React components by drag and drop.", accent: "Shared with the community.", kid: "wink" },
  "email-editor": { product: "email-editor", headline: "Write an email and see it as it will arrive.", accent: "In every inbox.", kid: "like" },
  adiutor: { product: "adiutor", headline: "One agenda for your work and your life.", accent: "Tell it once.", kid: "salute" },
  gymnasium: { product: "gymnasium", headline: "Guided training that adapts to you.", accent: "Your MiniFit is waiting.", kid: "strong" },
  sonus: { product: "sonus", headline: "Live radio, with the song playing now.", accent: "26,000 stations.", kid: "glad" },
  aura: { product: "aura", headline: "Your writing style, as a color.", accent: "What's your aura?", kid: "laugh" },
  oeconomicis: { product: "oeconomicis", headline: "Is your stock still in an uptrend?", accent: "The exit is worked out.", kid: "confident" },
  oleum: { product: "oleum", headline: "Everything worth knowing about a color.", accent: "One color at a time.", kid: "wow" },
  agora: { product: "agora", headline: "Websites for your business.", accent: "On your own domain.", kid: "wave" },
  "cibus-iter": { product: "cibus-iter", headline: "Eat like a local wherever you go.", accent: "Every dish a stamp.", kid: "yay" },
} as const satisfies Record<string, HomeBoard>;

export type ShareHomeId = keyof typeof SHARE_HOMES;

/**
 * The home card a product's board draws, ready for `renderShareCard`. Light unless `style: "dark"`, which
 * is the same words on black with no drawings (the board's "dark, the same page").
 */
export async function shareHomeCard(id: ShareHomeId, { style }: { style?: ShareStyle } = {}): Promise<ShareHomeCard> {
  const board: HomeBoard = SHARE_HOMES[id];
  const card: ShareHomeCard = {
    kind: "home",
    product: board.product,
    ...(board.name ? { name: board.name } : {}),
    headline: board.headline,
    accent: board.accent,
    ...(style === "dark" ? { style: "dark" as const } : {}),
  };
  if (style === "dark") return card;
  const art = board.art;
  return {
    ...card,
    kid: board.kid,
    ...(art === "robots-at-work" ? { art } : art ? { art: await shareAppIcons(art.icons, art.size) } : {}),
  };
}
