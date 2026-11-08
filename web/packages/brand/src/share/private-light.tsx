import { ArtZone } from "./art-zone";
import { Card } from "./card";
import type { CardContext } from "./context";
import { Mid } from "./mid";
import { Headline } from "./parts/headline";
import { MarkSlot } from "./parts/mark-slot";
import { Pic, type Picture } from "./pictures";
import { ProductHeader } from "./product-header";
import type { SharePrivateCard } from "./spec";

/** The private kind: what it is and who can open it, never its contents, with the kid in the middle. */
export function PrivateLight({ spec, ctx, kid }: { spec: SharePrivateCard; ctx: CardContext; kid?: Picture }) {
  return (
    <Card square={ctx.square}>
      <ProductHeader ctx={ctx} />
      <MarkSlot place="tr" width={150} />
      <Mid top={ctx.square ? 400 : 206} gap={22}>
        <Headline text={spec.headline} size={48} color="#111111" ink={ctx.ink} align="center" maxWidth={980} />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            maxWidth: 780,
            textAlign: "center",
            fontSize: 28,
            lineHeight: 1.4,
            fontWeight: 500,
            color: "rgba(17,17,17,.68)",
          }}
        >
          {spec.subline}
        </div>
      </Mid>
      <ArtZone square={ctx.square}>
        <div style={{ display: "flex" }} />
        {kid && <Pic picture={kid} width={200} />}
        <div style={{ display: "flex" }} />
      </ArtZone>
    </Card>
  );
}
