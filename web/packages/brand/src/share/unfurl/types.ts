/*
 * The six places a link lands (Lib-Share, "Unfurled"): a team chat, a microblog, a professional network, a
 * messenger, a phone and a community chat. They are drawn as PLAIN layouts, without the platforms' logos or
 * colors: what matters is where the image, the title and the domain land. Every one reads the same og:image;
 * none gets a special version.
 *
 * These are React DOM mockups for a gallery or a docs page, never Satori: they live apart from the card
 * renderer (`@javadaba/brand/share`) and are imported from `@javadaba/brand/share/unfurl`.
 */

export type UnfurlPlace = "slack" | "x" | "linkedin" | "messenger" | "phone" | "discord";

/** The card the platform reads, and the words around it. Nothing here is defaulted: a mockup shows the page's own words. */
export interface UnfurlProps {
  /** The card's address: the same `og:image` for every place. */
  image: string;
  /** What the card says (og:image:alt). */
  alt: string;
  /** og:title: the page's own title. */
  title: string;
  /** og:description: the page's first line. Messenger and phone show it or not as the platform does. */
  description?: string;
  /** The page's domain, without the scheme. */
  domain: string;
  /** The person who sent it, as the platform prints a name. */
  author: string;
  /** What they wrote around the link. */
  message: string;
  /** The link as typed in the message, when the platform prints it. */
  link?: string;
  /** The time or the age ("10:42", "2h"), and for a microblog the handle. */
  time?: string;
  handle?: string;
  /** The line under the author on a professional network ("Role · 1d"). */
  subline?: string;
  /** A site label above the title (Slack and Discord print the site name). */
  site?: string;
}

export interface UnfurlPlaceMeta {
  place: UnfurlPlace;
  /** The label over the mockup. */
  label: string;
}

export const UNFURL_PLACES: readonly UnfurlPlaceMeta[] = [
  { place: "slack", label: "Slack" },
  { place: "x", label: "X" },
  { place: "linkedin", label: "LinkedIn" },
  { place: "messenger", label: "WhatsApp" },
  { place: "phone", label: "iMessage" },
  { place: "discord", label: "Discord" },
];
