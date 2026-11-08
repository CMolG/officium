import { OS_STAGE_COLORS } from "./constants";
import { lighten, luminance } from "./hex";
import { brandEntry } from "./registry";

/*
 * seal-stage.ts: the numbers behind the seal stage (Content pages 4.07). Every product gets one in
 * three cuts, generated from its own colors, so no page waits for a drawing: a pale ground tinted
 * with the seal's lightest color, six soft blobs in its ramp, a dotted veil, and the seal on top.
 * Pure: the same brand always draws the same stage, on the server and on the client.
 */

interface StageBlob {
  /** Diameter, as a share of the stage's width. */
  size: number;
  /** Left edge, as a share of the stage's width (it may start outside). */
  left: number;
  /** Top edge, as a share of the stage's height (it may start outside). */
  top: number;
  color: string;
}

export interface StageColors {
  ground: string;
  blobs: StageBlob[];
}

// Six circles, biggest first, the way the design lays them: two large washes, two mid, two small.
const BLOB_SIZES = [1.9, 1.4, 1.1, 0.85, 0.45, 0.32] as const;

/** FNV-1a, so a brand's stage is the same on every render. */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The colors a brand's stage is made of: its glass list, or its gradient stops (an API's, the base mark's stroke); the OS tile has its own list. */
export function stageSource(brand: string): string[] {
  const entry = brandEntry(brand);
  if (!entry) return [];
  if (entry.glass?.length) return [...entry.glass];
  if (entry.variant === "os") return [...OS_STAGE_COLORS];
  return (entry.gradient ?? entry.stroke)?.stops.map((s) => s.color) ?? [];
}

export function stageColors(brand: string): StageColors | null {
  const source = stageSource(brand);
  if (!source.length) return null;
  const rand = mulberry32(hash(`seal-stage:${brand}`));
  const lightest = source.reduce((a, b) => (luminance(b) > luminance(a) ? b : a));
  const blobs = BLOB_SIZES.map((size, i): StageBlob => {
    const base = source[i % source.length]!;
    // The two big washes are the palest; the small ones keep the ramp's own color.
    return {
      size,
      left: -0.12 + rand() * 1.0,
      top: -0.5 + rand() * 0.8,
      color: lighten(base, i < 2 ? 0.45 : i < 4 ? 0.2 : 0),
    };
  });
  return { ground: lighten(lightest, 0.82), blobs };
}
