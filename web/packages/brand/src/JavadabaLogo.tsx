import { useId, type CSSProperties } from "react";
import {
  CANVAS,
  CENTER,
  CIRCLE_RADIUS,
  DIAMOND_POS,
  DIAMOND_RADIUS,
  DIAMOND_SIDE,
  ICON_POS,
  ICON_SIZE,
  ICON_STROKE,
  STROKE_WIDTH,
} from "./constants";
import { ApiSeal } from "./ApiSeal";
import { GlassSeal } from "./GlassSeal";
import { OsTile } from "./OsTile";
import {
  DropShadowFilter,
  Glyph,
  Gradient,
  InnerShadowFilter,
} from "./parts";
import { brandEntry } from "./registry";


export type LogoFormat = "spinner" | "rethink" | "glass";

/**
 * The format a brand presents in when acting as IDENTITY — nav chrome, card,
 * favicon, desktop icon. User decision, 2026-10-22, on top of the square of 2026-08-13:
 *
 *  - a product (a diamond in the registry) wears `glass`;
 *  - an API (`shape: "circle"`) wears `rethink`;
 *  - the base brand `javadaba`, the ecosystem's seal and not a product, wears `spinner`.
 *    It's recognized by its `variant: "mark"`, which is also the TECHNICAL reason it can't be
 *    anything else: a `mark` has no glyph inside the diamond, so a square would be empty.
 *
 * Javadaba OS draws its own tile whatever the format.
 */
export function identityFormat(brand: string): LogoFormat {
  const entry = brandEntry(brand);
  if (entry?.variant === "mark") return "spinner";
  return entry?.shape === "circle" ? "rethink" : "glass";
}

/**
 * Spinner animations. They used to live in `javadaba-landing/src/styles.css` and
 * **nobody used them**: the brand package carried its own inline linear
 * rotation, so the five in the CSS had been dead for months. They now live
 * here, which is where they can be picked, and the landing's CSS lost them
 * (2026-08-04).
 *
 * They all end in `rotate(360deg)` on purpose: `RotatingBrandSpinner` switches
 * brand on every `animationiteration`, and that edge has to land where the seal
 * is in the same position it started in. An animation ending at a different
 * angle would cause a visible jump right at the handoff.
 */
export type SpinAnimation = "linear" | "stop-go" | "pulse" | "deform" | "bouncy";

const SPIN_KEYFRAMES: Record<SpinAnimation, string> = {
  /** Constant spin. The usual one. */
  linear: "@keyframes jd-spin-linear{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}",
  /** Half turn, pause, half turn, pause. Mechanical, clock-like. */
  "stop-go":
    "@keyframes jd-spin-stop-go{0%{transform:rotate(0deg)}25%{transform:rotate(180deg)}50%{transform:rotate(180deg)}75%{transform:rotate(360deg)}100%{transform:rotate(360deg)}}",
  /** Spins while shrinking at the halfway point: it breathes. */
  pulse:
    "@keyframes jd-spin-pulse{0%{transform:rotate(0deg) scale(1)}50%{transform:rotate(180deg) scale(0.65)}100%{transform:rotate(360deg) scale(1)}}",
  /** Stretches and squashes at the quarters, like a coin spinning on its edge. */
  deform:
    "@keyframes jd-spin-deform{0%{transform:rotate(0deg) scale(1,1)}25%{transform:rotate(90deg) scale(1.18,0.82)}50%{transform:rotate(180deg) scale(1,1)}75%{transform:rotate(270deg) scale(0.82,1.18)}100%{transform:rotate(360deg) scale(1,1)}}",
  /** Overshoots and bounces back. */
  bouncy:
    "@keyframes jd-spin-bouncy{0%{transform:rotate(0deg)}30%{transform:rotate(200deg)}50%{transform:rotate(180deg)}80%{transform:rotate(380deg)}100%{transform:rotate(360deg)}}",
};

/** The non-linear ones carry their own rhythm; forcing `linear` would flatten them. */
const SPIN_TIMING: Record<SpinAnimation, string> = {
  linear: "linear",
  "stop-go": "cubic-bezier(0.65, 0, 0.35, 1)",
  pulse: "ease-in-out",
  deform: "ease-in-out",
  bouncy: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};


export interface JavadabaLogoProps {
  /** Brand registry key (sonus, aura, javadaba-os, …). */
  brand: string;
  /**
   * spinner = just the seal, loose and spinnable: BLACK diamond (a circle for an API), the
   *           brand's gradient on the edge, and WHITE glyph with its inner relief. Every brand.
   * rethink = an API's seal: the spinner's circle over its gradient box.
   * glass   = a product's seal (the user's chroma of 2026-10-22): the brand's `glass` colors
   *           as a grained background and a shape, a frosted pane, and the glyph with its
   *           shadows (`GlassSeal.tsx`).
   *
   * Omitted, the brand's identity (`identityFormat`). `glass` and `rethink` belong to one kind
   * of brand each (user decision, 2026-10-22): asking one of them of the other kind draws that
   * brand's identity instead.
   */
  format?: LogoFormat;
  /** Side in px (the SVG scales the 850 viewBox to this size). */
  size?: number;
  /**
   * Grain layer for the box formats (`rethink`, `glass`). `spinner` never paints it.
   *
   * Turned off in FAVICONS (user decision, 2026-08-13). Grain is a surface
   * texture: at 16 px it doesn't read as texture, it just dirties the gradient
   * and bloats the PNG.
   */
  grain?: boolean;
  /** Only format="spinner": animates the rotation. */
  spinning?: boolean;
  /** Which animation it uses while spinning. Defaults to constant rotation. */
  animation?: SpinAnimation;
  /** Seconds per spinner revolution. */
  speed?: number;
  /**
   * The seal's body for `spinner` and `rethink`. `dark` (default) is the black diamond; `light`
   * paints it WHITE, with a black glyph, for a seal that sits on black chrome — Sonus's bar,
   * where the black diamond disappeared into the background (user request, 2026-09-27).
   */
  tone?: "dark" | "light";
  className?: string;
  style?: CSSProperties;
  /** Accessible label; derived from `brand` if omitted. */
  title?: string;
}


/** Diamond = 400×400 square (rx 16) rotated 45° and centered. */
function Diamond({ fill, stroke }: { fill: string; stroke?: string }) {
  return (
    <rect
      x={DIAMOND_POS}
      y={DIAMOND_POS}
      width={DIAMOND_SIDE}
      height={DIAMOND_SIDE}
      rx={DIAMOND_RADIUS}
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? STROKE_WIDTH : undefined}
      transform={`rotate(45 ${CENTER} ${CENTER})`}
    />
  );
}

/** Circle (APIs): same role as Diamond, without rotation. */
function Circle({ fill, stroke }: { fill: string; stroke?: string }) {
  return (
    <circle
      cx={CENTER}
      cy={CENTER}
      r={CIRCLE_RADIUS}
      fill={fill}
      stroke={stroke}
      strokeWidth={stroke ? STROKE_WIDTH : undefined}
    />
  );
}

/**
 * The seal, with its SVG ids unique per instance (card://JAVA-267). `url(#…)` resolves to the
 * first element in the document with that id, so with ids per brand + format a second seal of
 * one brand borrowed the first one's clipPath, and lost its rounded corners when the first sat
 * in a closed `<details>` (the Javadaba menu's launcher). Only id-safe characters reach
 * `url(#…)`, which librsvg also has to resolve when an icon is rasterized from this SVG.
 */
export function JavadabaLogo(props: JavadabaLogoProps) {
  const instance = useId().replace(/[^A-Za-z0-9_-]/g, "");
  return <StandaloneLogo {...props} instance={instance} />;
}

/**
 * The same drawing without a hook, for a document that holds exactly ONE seal: the favicon
 * serializes it in a Next route handler, whose `react-dom/server.edge` renders with another copy
 * of React than the one this file imports, so a hook here has no dispatcher and throws. Its ids
 * carry no instance unless `instance` is given.
 */
export function StandaloneLogo({
  brand,
  format: requested,
  size = 64,
  grain = true,
  spinning = false,
  animation = "linear",
  speed = 2,
  tone = "dark",
  className,
  style,
  title,
  instance,
}: JavadabaLogoProps & { instance?: string }) {
  const entry = brandEntry(brand);
  if (!entry) return null;
  const variant = entry.variant ?? "icon";
  const format = requested === "spinner" ? "spinner" : identityFormat(brand);
  // Seal shape: circle for APIs, diamond (default) for apps.
  const Mark = entry.shape === "circle" ? Circle : Diamond;

  const p = instance ? `jd-${brand}-${format}-${instance}` : `jd-${brand}-${format}`;
  const ids = {
    grad: `${p}-grad`,
    stroke: `${p}-stroke`,
    dshadow: `${p}-dshadow`,
    inner: `${p}-inner`,
    noiseF: `${p}-noisef`,
    noiseM: `${p}-noisem`,
    clip: `${p}-clip`,
  };

  const label = title ?? `${brand} — Javadaba`;

  /**
   * Seal on black, shared by `spinner` and `rethink`: the diamond (or circle) goes
   * BLACK, the product's gradient moves to the EDGE, and the glyph inverts to white
   * while keeping its inner relief. For the base brand `javadaba`, which has no
   * `gradient`, it falls back to its `stroke` — i.e. the base seal doesn't change.
   */
  const stampStrokeId = entry.gradient ? ids.grad : ids.stroke;
  const hasStampStroke = Boolean(entry.gradient ?? entry.stroke);
  const stampBody = tone === "light" ? "#FFFFFF" : "#000000";
  const stampInk = tone === "light" ? "#000000" : "#FFFFFF";
  const Stamp = ({ strokeId = stampStrokeId }: { strokeId?: string }) => (
    <>
      <g filter={`url(#${ids.dshadow})`}>
        <Mark fill={stampBody} stroke={hasStampStroke ? `url(#${strokeId})` : undefined} />
      </g>
      {variant === "icon" && entry.icon && (
        <Glyph
          name={entry.icon}
          filterId={ids.inner}
          size={ICON_SIZE}
          pos={ICON_POS}
          strokeWidth={ICON_STROKE}
          color={stampInk}
        />
      )}
    </>
  );

  const spin =
    format === "spinner" && spinning
      ? {
          keyframes: <style>{SPIN_KEYFRAMES[animation]}</style>,
          style: {
            transformBox: "fill-box",
            transformOrigin: "center",
            animation: `jd-spin-${animation} ${speed}s ${SPIN_TIMING[animation]} infinite`,
          } satisfies CSSProperties,
        }
      : undefined;

  const frame = {
    viewBox: `0 0 ${CANVAS} ${CANVAS}`,
    width: size,
    height: size,
    className,
    style: { overflow: "hidden", ...style },
    role: "img",
    "aria-label": label,
    xmlns: "http://www.w3.org/2000/svg",
  } as const;

  if (variant === "os") {
    return (
      <svg {...frame}>
        {spin && <defs>{spin.keyframes}</defs>}
        <g style={spin?.style}>
          <OsTile id={p} letters={entry.letters ?? ""} />
        </g>
      </svg>
    );
  }

  if (format === "glass") {
    return (
      <svg {...frame}>
        <GlassSeal id={p} entry={entry} grain={grain} />
      </svg>
    );
  }

  if (format === "rethink") {
    return (
      <svg {...frame}>
        <ApiSeal id={p} entry={entry} grain={grain} />
      </svg>
    );
  }

  return (
    <svg {...frame}>
      <defs>
        {entry.gradient && <Gradient id={ids.grad} g={entry.gradient} />}
        {entry.stroke && <Gradient id={ids.stroke} g={entry.stroke} />}
        <DropShadowFilter id={ids.dshadow} />
        <InnerShadowFilter id={ids.inner} />
        {spin?.keyframes}
      </defs>

      <g style={spin?.style}>
        <Stamp />
      </g>
    </svg>
  );
}
