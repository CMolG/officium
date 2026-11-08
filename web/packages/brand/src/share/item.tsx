import { Card } from "./card";
import type { CardContext } from "./context";
import { Domain } from "./parts/domain";
import { ItemArt } from "./parts/item-art";
import { ItemText } from "./parts/item-text";
import { MarkSlot } from "./parts/mark-slot";
import { itemHeadlineSize } from "./parts/sizes";
import { Pic, type Picture } from "./pictures";
import { ProductHeader } from "./product-header";
import type { ShareItemCard } from "./spec";

/*
 * The item and article cards: a dish, a color, a book, a station, a job, a ticker, a post, a form,
 * a component, or a blog post. The product and where it was published, the headline (56, 48 or
 * 40 px by length), one line, and the item's own picture on the right. The mark sits at the bottom
 * left at 110 px, with the page's address beside it.
 */
export function ItemCard({ spec, ctx, kid }: { spec: ShareItemCard; ctx: CardContext; kid?: Picture }) {
  const art = spec.art ?? (kid ? <Pic picture={kid} width={300} /> : null);
  return (
    <Card square={ctx.square}>
      <ProductHeader ctx={ctx} />
      <ItemText
        kicker={spec.kicker}
        headline={spec.headline}
        subline={spec.subline}
        size={itemHeadlineSize(spec.headline)}
        ink={ctx.ink}
      />
      <MarkSlot place="bl" width={110} />
      <Domain text={spec.domain} />
      {art && <ItemArt>{art}</ItemArt>}
    </Card>
  );
}
