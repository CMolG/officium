import { BrowserFrame } from "./browser-frame";
import { Card } from "./card";
import { Domain } from "./parts/domain";
import { ItemArt } from "./parts/item-art";
import { ItemText } from "./parts/item-text";
import { itemHeadlineSize } from "./parts/sizes";
import type { ShareClientCard } from "./spec";

/*
 * A client's card: Agora sites and Quaestio forms share in the client's name and colors, without
 * the Javadaba mark. The client's name and initial top left, the item's column, and by default a
 * browser frame on the right for the client's site.
 */
/*
 * A client's card: Agora sites and Quaestio forms share in the client's name and colors, without
 * the Javadaba mark. The client's name and initial top left, the item's column, and by default a
 * browser frame on the right for the client's site.
 */
export function ClientCard({ spec, square }: { spec: ShareClientCard; square: boolean }) {
  const { client } = spec;
  const muted = `${client.ink}B8`;
  return (
    <Card square={square} background={client.background} color={client.ink}>
      <div style={{ display: "flex", position: "absolute", left: 56, top: 48, flexDirection: "row", alignItems: "center", columnGap: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 9999,
            border: `6px solid ${client.ink}`,
            fontSize: 30,
            fontWeight: 800,
            color: client.ink,
          }}
        >
          {client.initial ?? client.name.charAt(0)}
        </div>
        <div style={{ display: "flex", fontSize: 32, fontWeight: 800, color: client.ink }}>{client.name}</div>
      </div>
      <ItemText
        kicker={spec.kicker}
        headline={spec.headline}
        subline={spec.subline}
        size={itemHeadlineSize(spec.headline)}
        ink={client.accent}
        color={client.ink}
        muted={muted}
      />
      <ItemArt>{spec.art ?? <BrowserFrame domain={spec.domain} ink={client.ink} />}</ItemArt>
      <Domain text={spec.domain} left={56} bottom={52} color={muted} />
    </Card>
  );
}
