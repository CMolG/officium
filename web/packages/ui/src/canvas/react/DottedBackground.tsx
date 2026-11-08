'use client';

// packages/ui/src/canvas/react/DottedBackground.tsx
//
// PROVENANCE NOTE: port of Fluxor's imperative Canvas 2D class
// (`src/renderer/components/desktop/DottedBackground.ts`, read from source on 2026-08-15 while
// rewriting this component): staggered grid with GAP=40, circle/pill/star shapes with random
// per-cell properties, tiny resting scale that "blooms" as a wave passes, animated culling via
// `[data-shape-mask]` refreshed every 10 frames, and a permanent rAF loop. Wrapped in React
// (mount/ResizeObserver/destroy) and parametrized:
//
//   - `palette.dots` (new): a list of colors — each cell takes one at random, like Fluxor's
//     multicolor PALETTE. `palette.dot` (a single color, the previous behavior) remains the
//     engine's neutral default.
//   - Colors with `var(--…)`: canvas 2D doesn't resolve custom properties, so they're resolved
//     against the `<canvas>` element's own computed style when building the grid.
//   - `prefers-reduced-motion`: no wave and no scale animation (the dots are painted at rest and
//     the masks cut cleanly, with no transition).
//
// ALWAYS fixed to the screen (it doesn't read the engine's camera), like Fluxor's original: so the
// background doesn't get cut off while navigating, it's mounted in `<DabaCanvas>`'s `background`
// slot — OUTSIDE the pan-layer —, never as a child.

import { useEffect, useMemo, useRef } from 'react';

export type DottedShape = 'circle' | 'pill' | 'star';

export interface DottedBackgroundPalette {
  /** Single color (classic behavior). Ignored if `dots` is present. */
  dot?: string;
  /** Multicolor palette: each cell takes a random color (Fluxor pattern). */
  dots?: string[];
  background?: string;
}

export interface DottedBackgroundProps {
  gap?: number;
  palette?: DottedBackgroundPalette;
  /** Mix of shapes to distribute at random across cells (repeating one makes it more likely). */
  shapes?: DottedShape[];
  /** CSS selector: matching elements "punch through" the background (no dots drawn beneath them). */
  maskSelector?: string;
  /** Animates an expanding wave from the center on mount. */
  waveOnMount?: boolean;
  className?: string;
}

const DEFAULT_PALETTE: DottedBackgroundPalette = { dot: 'var(--daba-dot-color, rgba(113, 113, 122, 0.35))' };

// Constants from Fluxor's original (`DottedBackground.ts`).
const REST_SCALE = 0.09;
const SPEED_IN = 0.5;
const SPEED_OUT = 0.6;
const MIN_WAVE_SCALE = 1;
const MAX_WAVE_SCALE = 3;
const WAVE_SPEED = 1200;
const WAVE_WIDTH = 180;
const MASK_REFRESH_FRAMES = 10;

interface Shape {
  x: number;
  y: number;
  type: DottedShape;
  color: string;
  angle: number;
  size: number;
  scale: number;
  maxScale: number;
  points: number;
  innerRatio: number;
}

interface Wave {
  x: number;
  y: number;
  startTime: number;
}

function rnd(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Per-frame factor to reach 95% of the target in `seconds` at 60 fps (Fluxor's formula). */
function durationToFactor(seconds: number): number {
  if (seconds <= 0) return 1;
  return 1 - Math.pow(0.05, 1 / (60 * seconds));
}

/** Canvas 2D doesn't resolve `var(--…)`: it's resolved against the canvas's own computed style. */
function resolveColor(canvas: HTMLCanvasElement, color: string): string {
  if (!color.includes('var(')) return color;
  const previous = canvas.style.color;
  canvas.style.color = color;
  const resolved = getComputedStyle(canvas).color;
  canvas.style.color = previous;
  return resolved;
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  if (shape.type === 'circle') {
    ctx.beginPath();
    ctx.arc(0, 0, shape.size / 1.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (shape.type === 'pill') {
    const h = shape.size / 1.4;
    const w = h * 0.48;
    ctx.beginPath();
    const withRoundRect = ctx as CanvasRenderingContext2D & {
      roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
    };
    if (typeof withRoundRect.roundRect === 'function') withRoundRect.roundRect(-w, -h, w * 2, h * 2, w);
    else ctx.rect(-w, -h, w * 2, h * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  for (let i = 0; i < shape.points * 2; i++) {
    const angle = (i * Math.PI) / shape.points - Math.PI / 2;
    const r = i % 2 === 0 ? shape.size : shape.size * shape.innerRatio;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function buildGrid(width: number, height: number, gap: number, shapes: readonly DottedShape[], colors: readonly string[]): Shape[] {
  const cols = Math.floor(width / gap);
  const rows = Math.floor(height / gap);
  const offsetX = (width - (cols - 1) * gap) / 2;
  const offsetY = (height - (rows - 1) * gap) / 2;
  const grid: Shape[] = [];
  for (let row = 0; row < rows; row++) {
    const rowOffset = row % 2 === 1 ? gap / 2 : 0;
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * gap + rowOffset;
      if (x < 0 || x > width) continue;
      grid.push({
        x,
        y: offsetY + row * gap,
        type: pick(shapes),
        color: pick(colors),
        angle: rnd(0, Math.PI * 2),
        size: gap * 0.38,
        scale: REST_SCALE,
        maxScale: rnd(MIN_WAVE_SCALE, MAX_WAVE_SCALE),
        points: Math.floor(rnd(4, 11)),
        innerRatio: rnd(0.1, 0.5),
      });
    }
  }
  return grid;
}

export function DottedBackground({
  gap = 40,
  palette = DEFAULT_PALETTE,
  shapes = ['circle'],
  maskSelector = '[data-shape-mask]',
  waveOnMount = true,
  className,
}: DottedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stable keys: a consumer that passes `palette`/`shapes` inline must not reset the grid (and its
  // wave) on every one of its renders.
  const paletteKey = useMemo(() => JSON.stringify(palette), [palette]);
  const shapesKey = useMemo(() => JSON.stringify(shapes), [shapes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d') ?? null;
    if (!canvas || !ctx) return; // e.g. jsdom without the `canvas` package: degrades to an empty canvas without breaking

    const paletteSpec = JSON.parse(paletteKey) as DottedBackgroundPalette;
    const shapeMix = JSON.parse(shapesKey) as DottedShape[];
    const rawColors = paletteSpec.dots?.length ? paletteSpec.dots : [paletteSpec.dot ?? DEFAULT_PALETTE.dot!];
    const colors = rawColors.map((color) => resolveColor(canvas, color));
    const background = paletteSpec.background ? resolveColor(canvas, paletteSpec.background) : null;
    const reducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let grid: Shape[] = [];
    let waves: Wave[] = [];
    let maskRects: DOMRect[] = [];
    let frameCount = 0;
    let raf: number | null = null;
    let width = 0;
    let height = 0;

    function resize(): void {
      const parent = canvas!.parentElement;
      width = parent?.clientWidth ?? canvas!.clientWidth ?? 0;
      height = parent?.clientHeight ?? canvas!.clientHeight ?? 0;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.max(1, Math.floor(width * dpr));
      canvas!.height = Math.max(1, Math.floor(height * dpr));
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      grid = buildGrid(width, height, gap, shapeMix, colors);
      refreshMasks();
    }

    function refreshMasks(): void {
      const canvasRect = canvas!.getBoundingClientRect();
      maskRects = Array.from(document.querySelectorAll(maskSelector)).map((el) => {
        const r = el.getBoundingClientRect();
        return new DOMRect(r.left - canvasRect.left, r.top - canvasRect.top, r.width, r.height);
      });
    }

    function render(now: number): void {
      raf = null;
      ctx!.clearRect(0, 0, width, height);
      if (background) {
        ctx!.fillStyle = background;
        ctx!.fillRect(0, 0, width, height);
      }

      frameCount++;
      if (frameCount % MASK_REFRESH_FRAMES === 0) refreshMasks();

      const maxDist = Math.hypot(width, height);
      waves = waves.filter((wave) => ((now - wave.startTime) / 1000) * WAVE_SPEED < maxDist + WAVE_WIDTH);

      const pad = gap / 2;
      let settled = true;
      for (const shape of grid) {
        const masked = maskRects.some(
          (r) => shape.x >= r.x - pad && shape.x <= r.x + r.width + pad && shape.y >= r.y - pad && shape.y <= r.y + r.height + pad,
        );

        let waveInfluence = 0;
        if (!masked) {
          for (const wave of waves) {
            const waveRadius = ((now - wave.startTime) / 1000) * WAVE_SPEED;
            const dist = Math.hypot(shape.x - wave.x, shape.y - wave.y);
            const t = 1 - Math.abs(dist - waveRadius) / WAVE_WIDTH;
            if (t > 0) waveInfluence = Math.max(waveInfluence, Math.sin(Math.PI * t));
          }
        }

        const target = masked ? 0 : REST_SCALE + waveInfluence * (shape.maxScale - REST_SCALE);
        if (reducedMotion) {
          shape.scale = target;
        } else {
          const factor = target > shape.scale ? durationToFactor(SPEED_IN) : durationToFactor(SPEED_OUT);
          shape.scale += (target - shape.scale) * factor;
          if (shape.scale < 0.005) shape.scale = 0;
        }
        if (Math.abs(shape.scale - target) > 0.004) settled = false;

        if (shape.scale < REST_SCALE * 0.15) continue;
        ctx!.save();
        ctx!.translate(shape.x, shape.y);
        ctx!.rotate(shape.angle);
        ctx!.scale(shape.scale, shape.scale);
        ctx!.fillStyle = shape.color;
        drawShape(ctx!, shape);
        ctx!.restore();
      }

      // The loop isn't permanent like in Fluxor: once no wave is left alive and every scale has
      // reached its target, it goes to sleep and gets woken by the next tick of the mask clock
      // (below) — the masks follow the canvas's frames (pan/zoom/drag) without paying for a
      // continuous rAF at rest.
      if (waves.length > 0 || !settled) raf = requestAnimationFrame(render);
    }

    function wake(): void {
      if (raf === null) raf = requestAnimationFrame(render);
    }

    resize();
    if (waveOnMount && !reducedMotion) waves.push({ x: width / 2, y: height / 2, startTime: performance.now() });

    // Mask clock: while the rAF sleeps, a cheap interval re-reads the masked rects (frames that
    // move, panels that collapse) and wakes the loop only if something changed.
    const maskClock = window.setInterval(() => {
      const before = JSON.stringify(maskRects);
      refreshMasks();
      if (JSON.stringify(maskRects) !== before) wake();
    }, 150);

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => (resize(), wake())) : null;
    if (observer && canvas.parentElement) observer.observe(canvas.parentElement);

    wake();

    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      window.clearInterval(maskClock);
      observer?.disconnect();
    };
  }, [gap, paletteKey, shapesKey, maskSelector, waveOnMount]);

  return <canvas ref={canvasRef} className={['daba-dotted-background', className].filter(Boolean).join(' ')} aria-hidden="true" />;
}
