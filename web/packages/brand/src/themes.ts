/*
 * themes.ts — the product theme manifest.
 *
 * User decision, 2026-08-23, and the user's own words for what it should be: something that
 * "acts as an Android manifest where we define different products and color combinations we
 * can use and combine". That is what this is — a declaration, per product, of which surfaces
 * it may be dressed in and which one it wears by default, from which every color a piece needs
 * is DERIVED rather than written again.
 *
 * <h2>Why it has to exist</h2>
 *
 * The accent already had a single source (`accents.ts`) and the surfaces already had one
 * (`packages/ui/tokens.css`). What had none was the pairing: which surface a given product is
 * on. So each piece that needed to know guessed — the landing's `catalog.ts` declares a `theme`
 * per app, `ThemeFrame` maps it to a `data-jd-surface`, and anything outside the landing (a
 * miniapp, a shared dialog) could not reach either of them and had to hardcode. The account
 * dialog is the case that forced the issue: mounted from the landing it inherited the site's
 * tokens by accident, and mounted from Curriculum it inherited nothing and came out with a 4%
 * translucent panel over a blurred backdrop — a modal with no background.
 *
 * <h2>What it does NOT do</h2>
 *
 * It does not invent color. The accent still comes from `accentFor`, the surface values still
 * come from `tokens.css`. This file only says which of those apply where, and computes the two
 * derived values CSS cannot: the vivid stop and the readable mark (see `chroma.ts`).
 *
 * It also does not route. Which URL belongs to which product is the landing's business
 * (`src/lib/routes.ts`); this is keyed by brand slug.
 */

import { accentFor, type BrandAccent } from "./accents";
import { buttonFill, gradientInk, readableAccent, vividStop, type ButtonFillSpec } from "./chroma";

/** The four surfaces of `packages/ui/tokens.css` § 2. Named identically on purpose. */
export type SurfaceKind = "product" | "showcase" | "pulse" | "desktop";

/** Which way round a surface reads. Derived, never declared per product. */
export type Polarity = "light" | "dark";

export const POLARITY_OF: Readonly<Record<SurfaceKind, Polarity>> = {
  product: "light",
  showcase: "dark",
  pulse: "dark",
  desktop: "dark",
};

/** The page background each surface paints, needed by anything that has to be opaque. */
const CANVAS_OF: Readonly<Record<SurfaceKind, string>> = {
  product: "#FFFFFF",
  showcase: "#000000",
  pulse: "#080504",
  desktop: "#1C1C1E",
};

export interface ProductThemeEntry {
  /**
   * The surfaces this product may be dressed in, MOST PREFERRED FIRST. The first one is what
   * it wears when nobody says otherwise.
   *
   * A list and not a single value because the combination is the point: the same product is
   * `product` on its own pages and `showcase` on the landing's front page and its catalogue
   * ficha, and a piece that travels between the two —a dialog, a widget— has to be able to ask
   * for the other one and still get a legal answer.
   */
  surfaces: readonly [SurfaceKind, ...SurfaceKind[]];
  /** Why this default, in one line. A row without a reason is a row nobody can revisit. */
  reason: string;
}

/**
 * The manifest.
 *
 * **The default is `product` and it is not written down per app.** Only a product that departs
 * from it earns a row here, exactly like `accents.ts`'s `OVERRIDES` table: if this grows to one
 * entry per brand it has stopped being a manifest and become a copy of the registry.
 */
export const PRODUCT_THEMES: Readonly<Record<string, ProductThemeEntry>> = {
  sonus: {
    surfaces: ["pulse", "showcase"],
    reason:
      "Documented exception in design-surfaces.md: a player is watched, not read. Warm black " +
      "and cream ink are the product, so `product` is not among its legal surfaces.",
  },
  "javadaba-os": {
    surfaces: ["desktop", "showcase"],
    reason:
      "Closed user decision (2026-08-08): the desktop is an environment, not a page, and sits " +
      "outside the light-background rule.",
  },
};

/** Everything not in the manifest is a product on the product surface. */
const DEFAULT_SURFACES: readonly [SurfaceKind, ...SurfaceKind[]] = ["product", "showcase"];

/** The surfaces a brand may legally wear, most preferred first. */
export function surfacesFor(brand: string): readonly [SurfaceKind, ...SurfaceKind[]] {
  return PRODUCT_THEMES[brand]?.surfaces ?? DEFAULT_SURFACES;
}

/** The surface a brand wears when nobody says otherwise. */
export function surfaceFor(brand: string): SurfaceKind {
  return surfacesFor(brand)[0];
}

/** A product dressed in one surface: everything a piece needs, already resolved. */
export interface ProductTheme {
  brand: string;
  surface: SurfaceKind;
  polarity: Polarity;
  /** The opaque page color of this surface. What a dialog paints so it stops being a veil. */
  canvas: string;
  accent: BrandAccent;
  /** The stop that carries the brand, by chroma. */
  vivid: string;
  /** The vivid stop, dark (or light) enough to be seen on this surface, hue and chroma intact. */
  mark: string;
  /** The ink that reads on every stop of the gradient as a solid fill (`gradientInk`). */
  gradientInk: string;
  /** A gradient button's solid accent ink and its white label at AA (`buttonFill`, X08 Option 1). */
  buttonFill: ButtonFillSpec;
}

/**
 * Resolve a product against a surface.
 *
 * `surface` is a REQUEST, not an order: a surface this product doesn't declare falls back to
 * its default rather than being honored, which is what stops a caller from putting Sonus on a
 * white background because a generic dialog assumed light. That is the "combinations we can
 * use" half of the manifest — the list is a whitelist, not documentation.
 *
 * A brand with no accent in the registry resolves to `currentColor` on all three stops, which
 * is what `tokens.css` already declares as its own default: the piece inherits the ink around
 * it instead of painting an invented color.
 */
export function themeFor(brand: string, surface?: SurfaceKind): ProductTheme {
  const legal = surfacesFor(brand);
  const chosen = surface && legal.includes(surface) ? surface : legal[0];
  const accent = accentFor(brand) ?? { start: "currentColor", mid: "currentColor", end: "currentColor" };
  const canvas = CANVAS_OF[chosen];

  const known = accent.start !== "currentColor";
  const vivid = known ? vividStop([accent.start, accent.mid, accent.end]) : "currentColor";
  return {
    brand,
    surface: chosen,
    polarity: POLARITY_OF[chosen],
    canvas,
    accent,
    vivid,
    mark: known ? readableAccent(vivid, canvas) : "currentColor",
    gradientInk: known ? gradientInk([accent.start, accent.mid, accent.end]).ink : "#000000",
    buttonFill: buttonFill(known ? [accent.start, accent.mid, accent.end] : ["#111111"]),
  };
}

/**
 * The custom properties a surface publishes for a product.
 *
 * This is the ONE place the `--jd-accent-*` names are written by a consumer. Before it, every
 * root layout spelled the three stops out by hand and none of them published the two derived
 * ones, so `--jd-accent-mark` would have resolved to nothing exactly where it was needed.
 *
 * Returned as a plain object rather than a `CSSProperties` so this module stays free of React:
 * the desktop, a Playwright fixture and a build script all consume it too.
 */
export function themeVars(theme: ProductTheme): Record<string, string> {
  return {
    "--jd-accent-start": theme.accent.start,
    "--jd-accent-mid": theme.accent.mid,
    "--jd-accent-end": theme.accent.end,
    "--jd-accent-vivid": theme.vivid,
    "--jd-accent-mark": theme.mark,
    "--jd-accent-gradient-on": theme.gradientInk,
    "--jd-accent-fill": theme.buttonFill.background,
    "--jd-accent-fill-on": theme.buttonFill.ink,
  };
}

/** Shorthand for the common case: dress this brand in its default surface. */
export function brandVars(brand: string, surface?: SurfaceKind): Record<string, string> {
  return themeVars(themeFor(brand, surface));
}
