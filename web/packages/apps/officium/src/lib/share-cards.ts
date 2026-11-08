import type { ShareHomeCard, SharePrivateCard } from "@javadaba/brand/share";

/**
 * The link previews of Officium (Off-Previews, built with the share card core, Library 18). Static
 * on purpose: nothing from the request reaches an image. The home card is the product page's; the
 * private card is every page of the app, because a link into a project or a card is not public and
 * a card never shows its name, its text or its people.
 *
 * "Vacation mode: ON." is the design's proposed accent phrase (the owner has not answered), kept
 * as drawn so the owner reviews the words on the card, not a paraphrase.
 *
 * The article card of the Javadaba blog is drawn by the landing (its blog owns it), not here.
 */
export const HOME_CARD: ShareHomeCard = {
  kind: "home",
  product: "officium",
  name: "OFFICIUM",
  headline: "A backlog your team and your AI agents work on together.",
  accent: "Vacation mode: ON.",
  kid: "vacation",
  art: "robots-at-work",
};

export const PRIVATE_CARD: SharePrivateCard = {
  kind: "private",
  product: "officium",
  name: "OFFICIUM",
  headline: "A card was shared with you",
  subline: "Open it with the link. Only the people on the board can see it.",
  kid: "shh",
};
