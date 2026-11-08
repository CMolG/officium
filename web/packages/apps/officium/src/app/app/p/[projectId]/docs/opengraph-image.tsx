import { renderShareCard, shareAlt, shareImage, type ShareCardSpec } from "@javadaba/brand/share";

import { DOCS_SHARE } from "@/lib/docs/share";

/**
 * What a link to a page of a project's documentation shows when it is pasted (Doc-Previews, "A private link"): a
 * documentation page is private to the project's members, so the card says what it is and who can open it, never the
 * page's title or its words.
 */
const spec: ShareCardSpec = { kind: "private", product: "officium", headline: DOCS_SHARE.headline, subline: DOCS_SHARE.subline };

export const alt = shareAlt(spec);
export const { size, contentType } = shareImage;

export default async function Image() {
  return renderShareCard(spec);
}
