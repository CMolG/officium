import { renderShareCard, shareAlt, shareImage } from "@javadaba/brand/share";

import { PRIVATE_CARD } from "@/lib/share-cards";

/**
 * The preview of anything inside the app (Off-Previews, "A private link"): what it is and who can
 * open it, never a project's name or a card's title. The projects home, a board and a card's page
 * all inherit it from here.
 */
export const alt = shareAlt(PRIVATE_CARD);
export const { size, contentType } = shareImage;

export default async function OGImage() {
  return renderShareCard(PRIVATE_CARD);
}
