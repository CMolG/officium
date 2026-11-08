import type { CSSProperties, ReactNode } from "react";
import { JavadabaLogo } from "./JavadabaLogo";
import { lighten } from "./hex";
import { stageColors, stageSource } from "./seal-stage";

/*
 * The seal stage, Content pages 4.07: the art a product page, a blog cover and the strip before a
 * footer carry when no drawing is commissioned for them. It is the FLOOR: generated from the
 * product's own colors, always there, and a drawing of the kid goes on top of it when one is
 * wanted. Three cuts, from the design:
 *
 *   square    a product's opening art
 *   cover     the blog cover; `placement` is its three placements, `word` its hand-voice sound
 *   panorama  the strip before the footer
 */
export type StageCut = "square" | "cover" | "panorama";
export type StagePlacement = "center" | "right" | "below";

const CSS = `
:where(.jd-stage){width:100%}
.jd-stage{position:relative;overflow:hidden;display:grid;isolation:isolate;container-type:size}
.jd-stage[data-cut="square"]{aspect-ratio:1;border-radius:20px}
.jd-stage[data-cut="cover"]{aspect-ratio:23/12;border-radius:20px}
.jd-stage[data-cut="panorama"]{aspect-ratio:7/1;min-height:96px;border-radius:20px}
.jd-stage[data-placement="center"]{place-items:center}
.jd-stage[data-placement="right"]{place-items:center end;padding-right:9%}
.jd-stage[data-placement="below"]{place-items:end center}
.jd-stage-blobs{position:absolute;inset:-14%;z-index:0;pointer-events:none;filter:blur(24px)}
.jd-stage[data-cut="panorama"] .jd-stage-blobs{filter:blur(16px)}
.jd-stage-blobs i{position:absolute;display:block;border-radius:9999px}
.jd-stage-veil{position:absolute;inset:0;z-index:1;pointer-events:none;background:rgba(251,250,247,.16)}
.jd-stage-veil::after{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(17,17,17,.16) 0 .8px,transparent 1.2px);background-size:5px 5px;opacity:.6}
.jd-stage-accent{position:absolute;inset:0;z-index:1;pointer-events:none}
.jd-stage-seal{position:relative;z-index:2;flex:none;height:auto;filter:drop-shadow(0 18px 30px rgba(17,17,17,.22))}
.jd-stage[data-cut="square"] .jd-stage-seal{width:42cqmin}
.jd-stage[data-cut="cover"] .jd-stage-seal{width:46cqh}
.jd-stage[data-cut="panorama"] .jd-stage-seal{width:50cqh}
.jd-stage[data-placement="below"] .jd-stage-seal{translate:0 28%}
.jd-stage-word{position:absolute;left:8%;top:30%;z-index:3;font-family:var(--font-jd-hand,"Covered By Your Grace","Bradley Hand",cursive);font-size:16cqh;line-height:1.05;rotate:-6deg;color:#111111;pointer-events:none}
`;

export interface SealStageProps {
  /** A registry key: `officium`, `fabula`, `gymnasium`... Unknown keys draw nothing. */
  brand: string;
  cut?: StageCut;
  /** Where the seal sits. The cover's default is `right`; the others center. */
  placement?: StagePlacement;
  /** One or two words in the hand voice ("ping!"). Decorative: hidden from screen readers. */
  word?: string;
  /** The optional wash of the accent from the left, for covers that sit next to text. */
  veil?: boolean;
  className?: string;
  style?: CSSProperties;
  /** The product's own picture in the seal's place (Cibus Iter's stamps); the stage under it stays the product's. */
  children?: ReactNode;
}

export function SealStage({ brand, cut = "square", placement, word, veil, className, style, children }: SealStageProps) {
  const colors = stageColors(brand);
  if (!colors) return null;
  const place = placement ?? (cut === "cover" ? "right" : "center");
  const accent = stageSource(brand)[0]!;
  return (
    <div
      aria-hidden="true"
      data-cut={cut}
      data-placement={place}
      className={className ? `jd-stage ${className}` : "jd-stage"}
      style={{ background: colors.ground, ...style }}
    >
      <style href="jd-stage" precedence="default">
        {CSS}
      </style>
      <span className="jd-stage-blobs">
        {colors.blobs.map((b, i) => (
          <i
            key={i}
            style={{
              width: `${b.size * 100}cqw`,
              height: `${b.size * 100}cqw`,
              left: `${b.left * 100}%`,
              top: `${b.top * 100}%`,
              background: b.color,
            }}
          />
        ))}
      </span>
      <span className="jd-stage-veil" />
      {veil && (
        <span
          className="jd-stage-accent"
          style={{ background: `linear-gradient(90deg, ${lighten(accent, 0.35)}CC 0%, transparent 62%)` }}
        />
      )}
      {children ?? <JavadabaLogo brand={brand} format="glass" size={100} grain={false} className="jd-stage-seal" />}
      {word && <span className="jd-stage-word">{word}</span>}
    </div>
  );
}
