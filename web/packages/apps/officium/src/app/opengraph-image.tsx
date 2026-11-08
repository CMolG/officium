import { renderShareCard, shareAlt, shareImage } from "@javadaba/brand/share";

import { HOME_CARD } from "@/lib/share-cards";

/**
 * The product page's link preview (Off-Previews, "Its home card"): the light card of the share
 * card core. It inherits to every route below, `/landing` included; the app overrides it with the
 * private card (`app/app/opengraph-image.tsx`).
 */
export const alt = shareAlt(HOME_CARD);
export const { size, contentType } = shareImage;

export default async function OGImage() {
  return renderShareCard(HOME_CARD);
}
