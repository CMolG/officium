import { CANVAS, NOISE_OCTAVES } from "../constants";
import type { BrandNoise } from "../registry";
import { NOISE_OFFSETS, NOISE_SEEDS, baseFrequencyFor } from "./noise";

export function NoiseDefs({ filterId, maskId, noise }: { filterId: string; maskId: string; noise: BrandNoise }) {
  return (
    <>
      {noise.layers.map((_, i) => (
        <filter key={i} id={`${filterId}-${i}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={baseFrequencyFor(noise.grain)}
            numOctaves={NOISE_OCTAVES}
            seed={NOISE_SEEDS[i % NOISE_SEEDS.length]}
            stitchTiles="stitch"
          />
          {/* R→(R,G,B) so luminance carries the grain; alpha=1. */}
          <feColorMatrix type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" />
        </filter>
      ))}
      {noise.layers.map((_, i) => {
        const off = NOISE_OFFSETS[i % NOISE_OFFSETS.length];
        return (
          <mask key={i} id={`${maskId}-${i}`}>
            {/* Painted oversized and offset so each layer shows a different area of
                its turbulence without leaving corners uncovered. */}
            <rect
              x={-off}
              y={-off}
              width={CANVAS + off * 2}
              height={CANVAS + off * 2}
              filter={`url(#${filterId}-${i})`}
            />
          </mask>
        );
      })}
    </>
  );
}
