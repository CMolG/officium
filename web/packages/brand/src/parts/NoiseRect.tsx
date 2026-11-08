import { CANVAS } from "../constants";
import type { BrandNoise } from "../registry";

export function NoiseRect({ maskId, noise }: { maskId: string; noise: BrandNoise }) {
  return (
    <>
      {noise.layers.map((layer, i) => (
        <rect
          key={i}
          width={CANVAS}
          height={CANVAS}
          fill={layer.color}
          opacity={layer.opacity}
          mask={`url(#${maskId}-${i})`}
        />
      ))}
    </>
  );
}
