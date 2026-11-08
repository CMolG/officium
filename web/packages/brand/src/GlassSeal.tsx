import { CANVAS, CANVAS_RADIUS, ICON_POS_BG, ICON_SIZE_BG, ICON_STROKE_BG } from "./constants";
import {
  GLASS_BACKGROUND_RAMP,
  GLASS_FROST_STD,
  GLASS_GRADE,
  GLASS_GLYPH_INNER_SHADOW,
  GLASS_GLYPH_SHADOWS,
  GLASS_INNER_SHADOW,
  GLASS_NOISE,
  GLASS_PANE,
  GLASS_PANE_SHADOWS,
  GLASS_RIM,
  GLASS_SHAPE_OFFSET,
  GLASS_SHAPE_PATH,
  GLASS_SHAPE_RAMP,
  GLASS_SHAPE_SHADOWS,
} from "./glass-constants";
import { DropShadowFilter, GlassInnerShadowFilter, Glyph, InnerShadowFilter, NoiseDefs, NoiseRect, Ramp } from "./parts";
import type { BrandEntry } from "./registry";

/*
 * The glass seal (user's chroma, 2026-10-22): the product's identity tile.
 *
 * Four layers, bottom to top: the brand's colors as a grained background, the shape (`shape.svg`)
 * in the same colors with no grain, a frosted glass pane, and the lucide glyph. Only the colors
 * are the brand's (`glass` in registry.ts); every effect is global (`glass-constants.ts`).
 *
 * <h2>How the colors are laid out</h2>
 *
 * The user gives each product a plain list of colors, two to seven, evenly spread. The design's
 * renders (Lib-Brand 11, wave 7) run the two layers over that list in opposite directions: the
 * background from the first color in the top-left corner to the last in the bottom-right one
 * (diagonal: Officium opens purple, not cyan), and the shape from the last color at its top to
 * the first at the foot of its stem (vertical). The ramps' extents are in `glass-constants.ts`.
 */

export function GlassSeal({ id, entry, grain }: { id: string; entry: BrandEntry; grain: boolean }) {
  const colors = [...(entry.glass ?? [])];
  const reversed = [...colors].reverse();
  const pane = GLASS_PANE;
  const ids = {
    clip: `${id}-clip`,
    bg: `${id}-bg`,
    shape: `${id}-shape`,
    shapeShadow: `${id}-shape-shadow`,
    inner: `${id}-glass-inner`,
    backdrop: `${id}-backdrop`,
    frost: `${id}-frost`,
    paneClip: `${id}-pane`,
    paneShadow: `${id}-pane-shadow`,
    glyphShadow: `${id}-glyph-shadow`,
    glyphInner: `${id}-glyph-inner`,
    grade: `${id}-grade`,
    noiseF: `${id}-noisef`,
    noiseM: `${id}-noisem`,
  };
  const paneRect = { x: pane.pos, y: pane.pos, width: pane.side, height: pane.side, rx: pane.radius };

  return (
    <>
      <defs>
        <clipPath id={ids.clip}>
          <rect width={CANVAS} height={CANVAS} rx={CANVAS_RADIUS} />
        </clipPath>
        <clipPath id={ids.paneClip}>
          <rect {...paneRect} />
        </clipPath>
        <Ramp id={ids.bg} colors={colors} coords={GLASS_BACKGROUND_RAMP} />
        <Ramp id={ids.shape} colors={reversed} coords={GLASS_SHAPE_RAMP} />
        <DropShadowFilter id={ids.shapeShadow} layers={GLASS_SHAPE_SHADOWS} />
        <DropShadowFilter id={ids.paneShadow} layers={GLASS_PANE_SHADOWS} />
        <DropShadowFilter id={ids.glyphShadow} layers={GLASS_GLYPH_SHADOWS} />
        <GlassInnerShadowFilter id={ids.inner} shadow={GLASS_INNER_SHADOW} />
        <InnerShadowFilter id={ids.glyphInner} shadow={GLASS_GLYPH_INNER_SHADOW} />
        <filter id={ids.grade} colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values={String(GLASS_GRADE.saturate)} />
          <feComponentTransfer>
            <feFuncR type="linear" slope={GLASS_GRADE.gain} />
            <feFuncG type="linear" slope={GLASS_GRADE.gain} />
            <feFuncB type="linear" slope={GLASS_GRADE.gain} />
          </feComponentTransfer>
        </filter>
        <filter id={ids.frost} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={GLASS_FROST_STD} edgeMode="duplicate" />
        </filter>
        {grain && <NoiseDefs filterId={ids.noiseF} maskId={ids.noiseM} noise={GLASS_NOISE} />}
      </defs>

      <g clipPath={`url(#${ids.clip})`}>
        <g id={ids.backdrop}>
          <rect width={CANVAS} height={CANVAS} fill={`url(#${ids.bg})`} filter={`url(#${ids.grade})`} />
          {grain && <NoiseRect maskId={ids.noiseM} noise={GLASS_NOISE} />}
          <g filter={`url(#${ids.shapeShadow})`}>
            <g filter={`url(#${ids.grade})`}>
              <path
                d={GLASS_SHAPE_PATH}
                transform={`translate(${GLASS_SHAPE_OFFSET.x} ${GLASS_SHAPE_OFFSET.y})`}
                fill={`url(#${ids.shape})`}
                filter={`url(#${ids.inner})`}
              />
            </g>
          </g>
        </g>

        {/* The pane's shadow first: the frosted backdrop is opaque and covers the part under it. */}
        <rect {...paneRect} fill="#000000" filter={`url(#${ids.paneShadow})`} />
        <g clipPath={`url(#${ids.paneClip})`}>
          <use href={`#${ids.backdrop}`} filter={`url(#${ids.frost})`} />
        </g>
        <rect
          {...paneRect}
          fill={pane.fill}
          fillOpacity={pane.fillOpacity}
          stroke="#FFFFFF"
          strokeOpacity={GLASS_RIM.opacity}
          strokeWidth={GLASS_RIM.width}
          filter={`url(#${ids.inner})`}
        />

        {entry.icon && (
          <g filter={`url(#${ids.glyphShadow})`}>
            <Glyph
              name={entry.icon}
              filterId={ids.glyphInner}
              size={ICON_SIZE_BG}
              pos={ICON_POS_BG}
              strokeWidth={ICON_STROKE_BG}
            />
          </g>
        )}
      </g>
    </>
  );
}
