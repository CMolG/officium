/*
 * @javadaba/brand/share: the share card (Library 18), the image a link shows when someone pastes
 * it. Server only (`next/og`, files read from disk). The map of the pieces:
 *
 *   renderShareCard(spec, { square? })   the card, as an ImageResponse
 *   shareHomeCard(id, { style? })        the home card a product's Link previews board draws (light unless dark is asked)
 *   shareImage · shareAlt(spec)          what an `opengraph-image.tsx` exports
 *   shareMetadata({ title, ... })        the og: and twitter: tags the page sets
 *   ShareMark · ShareEchoBox · ShareEchoIcon · Pic · words
 *                                        Satori-safe parts for an item's own picture
 *   shareSealArt · shareAppIcons         the seal over its echo, a row of seals: art while a product has none
 *   shareInk · shareGradient             the product's colors on the card
 *   trace.mjs (`@javadaba/brand/share/trace`)  `outputFileTracingIncludes` for the app's next.config
 */
export { renderShareCard, type RenderOptions } from "./render";
export { SHARE_HOMES, shareHomeCard, type ShareHomeId } from "./homes";
export { shareImage, shareMetadata, type ShareMetadataInput } from "./meta";
export {
  SHARE_CONTENT_TYPE,
  SHARE_PADDING,
  SHARE_SIZE,
  SHARE_SQUARE_SIZE,
  shareAlt,
  type ShareCardSpec,
  type ShareClientCard,
  type ShareHomeCard,
  type ShareItemCard,
  type SharePrivateCard,
  type ShareProductSpec,
  type ShareStyle,
} from "./spec";
export { shareGradient, shareInk, shareInkOnDark } from "./ink";
export { ShareMark } from "./parts/mark";
export { words } from "./parts/words";
export { ShareEchoBox } from "./echo-box";
export { ShareEchoIcon } from "./echo-icon";
export { BrowserFrame } from "./browser-frame";
export { Pic, kidPicture, stripPicture, type Picture } from "./pictures";
export { GlyphSvg } from "./assets";
export { shareAppIcons, shareSealArt } from "./art";
export { shareTrim } from "./trim";
