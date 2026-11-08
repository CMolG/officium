import { GlyphSvg, glyphNameFor } from "./assets";
import { shareGradient, shareInkOnDark } from "./ink";
import { Card } from "./card";
import type { CardContext } from "./context";
import { Header } from "./parts/header";
import { Headline } from "./parts/headline";
import { MarkSlot } from "./parts/mark-slot";
import { Wordmark } from "./parts/wordmark";
import type { ShareHomeCard } from "./spec";

/*
 * The dark card, for dark places: black, the gradient tile with the product's glyph in ink, the
 * glyph huge and faint behind everything (texture, not information), a bar in the product's
 * gradient under the headline, and the mark in white bottom right. No drawings.
 */
const GROUND = "#0B0B0C";

export function HomeDark({ spec, ctx }: { spec: ShareHomeCard; ctx: CardContext }) {
  const stops = shareGradient(ctx.slug);
  const gradient = `linear-gradient(135deg, ${stops.join(", ")})`;
  const ink = shareInkOnDark(ctx.slug);
  const glyph = glyphNameFor(ctx.slug);
  return (
    <Card square={ctx.square} background={GROUND} color="#FFFFFF">
      {glyph && (
        <div style={{ display: "flex", position: "absolute", left: 280, top: ctx.square ? 280 : 70, width: 640, height: 640 }}>
          <GlyphSvg name={glyph} size={640} color="#1C1C1F" stroke={2.2} />
        </div>
      )}
      <Header>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 104,
            height: 104,
            borderRadius: 25,
            background: gradient,
          }}
        >
          {glyph && <GlyphSvg name={glyph} size={52} color="#111111" stroke={1.6} />}
        </div>
        <Wordmark name={ctx.name} ink={ink} color="#FFFFFF" />
      </Header>
      <MarkSlot place="br" width={150} black="#FFFFFF" />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 100,
          right: 100,
          top: ctx.square ? 430 : 228,
          flexDirection: "column",
          alignItems: "center",
          rowGap: 34,
        }}
      >
        <Headline text={spec.headline} accent={spec.accent} size={44} color="#FFFFFF" ink={ink} align="center" maxWidth={980} />
        <div style={{ display: "flex", width: 270, height: 12, borderRadius: 6, background: `linear-gradient(90deg, ${stops.join(", ")})` }} />
      </div>
    </Card>
  );
}
