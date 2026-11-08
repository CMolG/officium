import { ArtZone } from "./art-zone";
import { Card } from "./card";
import type { CardContext, HomePictures } from "./context";
import { Mid } from "./mid";
import { Headline } from "./parts/headline";
import { MarkSlot } from "./parts/mark-slot";
import { Pic } from "./pictures";
import { ProductHeader } from "./product-header";
import type { ShareHomeCard } from "./spec";

/*
 * The light card, the default: white, the glass tile, the mark top right, the headline centered,
 * and the kid and the product along the bottom 190 px (Library 18).
 */
export function HomeLight({ spec, ctx, pictures }: { spec: ShareHomeCard; ctx: CardContext; pictures: HomePictures }) {
  const { art } = spec;
  return (
    <Card square={ctx.square}>
      <ProductHeader ctx={ctx} />
      {ctx.slug !== "javadaba" && <MarkSlot place="tr" width={150} />}
      <Mid top={ctx.square ? 430 : 228} gap={34}>
        <Headline text={spec.headline} accent={spec.accent} size={44} color="#111111" ink={ctx.ink} align="center" maxWidth={980} />
      </Mid>
      <ArtZone square={ctx.square}>
        {pictures.kid ? <Pic picture={pictures.kid} width={230} /> : <div style={{ display: "flex" }} />}
        {art === "robots-at-work" && pictures.strip ? <Pic picture={pictures.strip} width={520} /> : art !== "robots-at-work" && art}
      </ArtZone>
    </Card>
  );
}
