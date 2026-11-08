/*
 * registry.ts — the brand as data. Each entry is an object with properties
 * (gradient + lucide icon + variant) that <JavadabaLogo brand="..."/> maps
 * automatically. Adding a new logo = adding an entry here.
 *
 * Source of truth for the gradients: the Figma values passed by the user
 * (2026-07-03). Where the landing's catalog (catalog.ts `accent`) diverged, these
 * win. The stops are NOT always at 50% (curriculum 39%, gymnasium 21%).
 *
 * Angle convention (Figma): 0° = left→right, 90° = top→bottom. Interpreted in
 * SCREEN space (the gradient doesn't rotate with the diamond), so 90° is a
 * vertical gradient. See GradientDef in JavadabaLogo.tsx.
 */

/** A gradient stop: color + position in % (0..100). */
export interface GradientStop {
  color: string;
  at: number;
}

/** Linear brand gradient (2–3 stops) with an angle in Figma convention. */
export interface BrandGradient {
  stops: GradientStop[];
  /** Figma angle in degrees. Defaults to 90 (vertical, top→bottom). */
  angle: number;
}

/** A noise layer: color + opacity. */
export interface NoiseLayer {
  color: string;
  opacity: number;
}

/**
 * A grain: the accent surface's (`surfaceNoise`), the glass seal's (`GLASS_NOISE`) and the API
 * seal's (`DEFAULT_NOISE`, mono `#AAAAAA` at 25%).
 *
 * Usually a **duo**: two layers of different color over the same turbulence but with their own
 * seed and offset, which is what produces two-tone grain instead of a flat gray.
 *
 * `grain` is the **grain size exactly as it comes from Figma**, not the
 * `feTurbulence`'s `baseFrequency`. The two scales are INVERTED and mixing them
 * up shows instantly: in Figma, small size = fine grain; in SVG, high
 * `baseFrequency` = fine grain. Taking Figma's 0.1 as `baseFrequency` produced
 * huge blotches that at half opacity covered the box with a flat gray.
 *
 * The conversion (`baseFrequency = 1 / grain`) lives in `JavadabaLogo`, in one
 * single place, so the registry keeps storing exactly what Figma says and any
 * reajustment of the criterion is a one-line change.
 */
export interface BrandNoise {
  grain: number;
  layers: NoiseLayer[];
}

/**
 * Structural variant of the logo:
 *  - "icon": diamond filled with the gradient + lucide glyph (most apps).
 *  - "mark": black diamond with a gradient stroke, no icon (base logo "javadaba").
 *  - "os":   no diamond: `letters` as dots on the dark gradient tile, in every
 *            format (`OS_*` in constants.ts). Only Javadaba OS.
 */
export type BrandVariant = "icon" | "mark" | "os";

export interface BrandEntry {
  /** Structural variant. Defaults to "icon". */
  variant?: BrandVariant;
  /** Kebab name of the lucide icon (variant "icon"). */
  icon?: string;
  /** Primary gradient: the accent (`accents.ts`), the spinner's edge and the API seal's box. */
  gradient?: BrandGradient;
  /** Stroke gradient (variant "mark"). */
  stroke?: BrandGradient;
  /** The letters drawn as dots (variant "os"); each one needs its `OS_DOT_GLYPHS` entry. */
  letters?: string;
  /** Seal shape: diamond (apps, default) or circle (APIs). */
  shape?: "diamond" | "circle";
  /**
   * Grain of the **accent surface** (`AccentSurface` in `@javadaba/ui`): the
   * full-bleed gradient dressing the widget's floating piece, the miniapps'
   * content boxes, and Aura's profile band. The seals carry no per-brand grain:
   * glass has one global grain (user decision, 2026-10-22) and the API seal the mono one.
   *
   * It lives here, and not in the app that paints it, because until 2026-08-11
   * it was declared in `javadaba-landing/src/lib/app-theme.ts` for ten slugs
   * **and** in this registry for three, with the recipe implemented twice. The
   * consequence of having the good copy outside the system was literal: the
   * `AccentSurface` in `@javadaba/ui` only read this registry, so for `sonus`
   * and `aura` it found no grain and showed exactly the plastic-looking
   * gradient that its own header says grain exists to avoid.
   */
  surfaceNoise?: BrandNoise;
  /**
   * The glass seal's colors (`format="glass"`, every product's identity since 2026-10-22), as
   * the user gave them, two to seven; every product has them (`glass.test.tsx`), an API none. A
   * list and not a gradient: `GlassSeal` spreads it over the shape and, reversed, the background.
   * Separate from `gradient` because that one also feeds every app's accent (`accents.ts`), and
   * the new chroma was given for the seal only.
   */
  glass?: readonly string[];
}

export const brandRegistry: Record<string, BrandEntry> = {
  // Base concept: black diamond with a gradient stroke, no icon (Figma -45°).
  javadaba: {
    variant: "mark",
    stroke: {
      angle: -45,
      stops: [
        { color: "#C9C9C9", at: 0 },
        { color: "#7E7E7E", at: 50 },
        { color: "#666666", at: 100 },
      ],
    },
  },
  // Dotted "OS" on the dark diagonal tile (JAVA-268). Its tile is not a brand
  // gradient other code may read: it lives with its measurements in constants.ts.
  "javadaba-os": {
    variant: "os",
    letters: "OS",
  },

  sonus: {
    icon: "audio-lines",
    glass: ["#FF6E6E", "#E6A780", "#FFE77C"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#DB5555", at: 0 },
        { color: "#C27E55", at: 50 },
        { color: "#FBCD00", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#EF8550", opacity: 0.25 },
        { color: "#FA581D", opacity: 0.25 },
      ],
    },
  },
  aura: {
    icon: "audio-waveform",
    glass: ["#3695AC", "#87E2DB", "#D7EAF3"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#007D9D", at: 0 },
        { color: "#5AE2D7", at: 50 },
        { color: "#A7E3FF", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#0A16FF", opacity: 0.25 },
        { color: "#197735", opacity: 0.25 },
      ],
    },
  },
  fluxor: {
    icon: "orbit",
    glass: ["#E1D4B4", "#E2E2E2", "#5A5A5A"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#E1D4B4", at: 0 },
        { color: "#E2E2E2", at: 50 },
        { color: "#FFFFFF", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#F4C885", opacity: 0.25 },
        { color: "#F5D9C6", opacity: 0.25 },
      ],
    },
  },
  // Back to the ORIGINAL amber (user decision, 2026-08-21), undoing the blue of
  // 2026-08-10 (`4c6fd41c`). These three values are the ones Figma drew and the
  // ones the product mockup is built on; the blue was an experiment that lasted
  // eleven days. It changes HERE because this file is the single source of brand
  // color: the diamond, the favicon, the catalog card, the desktop widget, and
  // the app's accent all come from here.
  //
  // No exception in `accents.ts` — the accent stays DERIVED from the seal, same as
  // it was before the blue. What the ramp DOES force is the ink on top of it, and
  // that is the one thing the blue was hiding:
  //
  //   #FFCD50  first stop, and the one that dresses the CTA. It takes BLACK ink
  //            (12.7:1 against `--jd-ink`); white on it is 1.5:1, which is what
  //            Curriculum's `--color-primary-foreground` used to hardcode while
  //            the accent was dark. `Button variant="accent"` already picks the
  //            ink by luminance (`inkOn`), so it needed nothing.
  //   #FFCEA1  central stop at 39% — the position is NOT touched, it comes from
  //            Figma. It's the `--jd-accent` as chip fill and card edge, and the
  //            root of `--jd-accent-ink` (#7A614B on the product surface, 5.8:1).
  //   #F4F2DB  cream close. It is light, but it is not shine: the mockup uses it
  //            as a real surface (avatar chips, washes), which is why it does not
  //            take the `isHighlight` treatment that tributa/fluxor need.
  curriculum: {
    icon: "scroll-text",
    glass: ["#FFCD50", "#FFCEA1", "#CDB8FC"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#FFCD50", at: 0 },
        { color: "#FFCEA1", at: 39 },
        { color: "#F4F2DB", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#A39D93", opacity: 0.25 },
        { color: "#F8F0DD", opacity: 0.25 },
      ],
    },
  },
  // Rebrand 2026-07-20 (plan #22): the key used to be `factura` and was left
  // unrenamed, so `AppLogo` found no entry for the `tributa` slug and fell back
  // to the legacy PNG/SVG instead of composing the diamond. Fixed 2026-08-04.
  tributa: {
    icon: "receipt-text",
    glass: ["#4E64ED", "#7EAEBE", "#E0EBC5"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#5868D3", at: 0 },
        { color: "#7699A5", at: 50 },
        { color: "#FFFFFF", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#BBC5FE", opacity: 0.25 },
        { color: "#B8FFEE", opacity: 0.25 },
      ],
    },
  },
  fabula: {
    icon: "pilcrow",
    glass: ["#82F2E1", "#E998EF", "#FF8C8C"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#82F2E1", at: 0 },
        { color: "#E998EF", at: 50 },
        { color: "#FF8C8C", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#FFFFFF", opacity: 0.3 },
        { color: "#FFFFFF", opacity: 0.25 },
      ],
    },
  },
  // User's Figma values (2026-08-04). Replace the earlier violet gradient and
  // the `message-circle-question` icon.
  quaestio: {
    icon: "clipboard-list",
    glass: ["#C987B7", "#EFB7EE", "#FFEC95"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#A94A8F", at: 0 },
        { color: "#F79BF5", at: 50 },
        { color: "#FFFFFF", at: 100 },
      ],
    },
  },
  creatio: {
    icon: "line-squiggle",
    glass: ["#FF9A63", "#FEE465", "#FFEE82", "#FF6F85", "#F5A0FF"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#FF5900", at: 0 },
        { color: "#FFD500", at: 30 },
        { color: "#F2D30B", at: 41 },
        { color: "#FF153A", at: 69 },
        { color: "#E600FF", at: 100 },
      ],
    },
  },
  // Officium's chrome, given by the user on 2026-09-15: gradient and glyph. Replaces
  // the provisional entry of JDB-222 -- whose `kanban-square` was not even in `ICONS`, so the
  // seal painted no glyph at all.
  officium: {
    icon: "layers",
    glass: ["#AEAFF2", "#ADA9D2", "#98F1FF"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#78E6F7", at: 0 },
        { color: "#877AF4", at: 50 },
        { color: "#6568F3", at: 100 },
      ],
    },
  },
  // PROVISIONAL (JAVA-145): Adiutor was born without a seal from the user, and `catalog.ts`
  // refuses a slug with none. Warm amber to plum, the day from morning to evening, picked so no
  // stop is white (the accent is the seal's own stops, `accents.ts`). Replace with the user's
  // values when they give them, the way Officium's provisional entry was. Its `glass` is the
  // same three stops, provisional for the same reason (2026-10-22).
  adiutor: {
    icon: "calendar-check",
    glass: ["#F9B24F", "#EE6A4D", "#9B3F8E"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#F9B24F", at: 0 },
        { color: "#EE6A4D", at: 50 },
        { color: "#9B3F8E", at: 100 },
      ],
    },
  },
  // PROVISIONAL (JAVA-1262): the free email editor was born without a seal from the user.
  // Adiutor's shape in cool blue to green; no stop is white. `glass` is those stops, like Adiutor's.
  "email-editor": {
    icon: "mail",
    glass: ["#4F8EF9", "#2FB7C9", "#2F8F6B"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#4F8EF9", at: 0 },
        { color: "#2FB7C9", at: 50 },
        { color: "#2F8F6B", at: 100 },
      ],
    },
  },
  oleum: {
    icon: "droplets",
    glass: ["#D77979", "#DA8864", "#E9E96B", "#ABE47F", "#8EE6E7", "#B87FE1", "#DE8CD3"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#E01E1E", at: 0 },
        { color: "#DB5820", at: 18 },
        { color: "#E8E81B", at: 29 },
        { color: "#71DD1E", at: 36 },
        { color: "#23DADD", at: 50 },
        { color: "#911FE3", at: 72 },
        { color: "#DA24C1", at: 88 },
      ],
    },
  },
  gymnasium: {
    icon: "hand-fist",
    glass: ["#FF8E5D", "#FDAC76", "#FF6FB7"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#FFFFFF", at: 0 },
        { color: "#FFFFFF", at: 21 },
        { color: "#FF4D00", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#7E7E7E", opacity: 0.25 },
        { color: "#FF7300", opacity: 0.25 },
      ],
    },
  },

  // User's croma values (2026-08-30). Product not developed yet (catalog: COMING
  // SOON); the seal exists first because the ficha and the accent need it.
  // "Progressive" gradient in the spec = evenly spread stops.
  oeconomicis: {
    icon: "chart-line",
    glass: ["#FFFFFF", "#FFEC83", "#D6C383", "#ECD682", "#FFEF80"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#FFFFFF", at: 0 },
        { color: "#FFD700", at: 25 },
        { color: "#D4AF37", at: 50 },
        { color: "#EFBF04", at: 75 },
        { color: "#FFDF00", at: 100 },
      ],
    },
  },
  // User's croma values (2026-08-30). Same situation as oeconomicis.
  "cibus-iter": {
    icon: "soup",
    glass: ["#A86667", "#E3888A", "#FFF7A3"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#A70003", at: 0 },
        { color: "#E72225", at: 50 },
        { color: "#FFCFCF", at: 100 },
      ],
    },
  },
  // User's values (2026-10-08): gradient and the `clapperboard` glyph. The user gave no grain for
  // the accent surface, so Theatrum's surface has none yet.
  theatrum: {
    icon: "clapperboard",
    // Reversed from the order given (9FEECF, F8E4A1, F29395) to the order its 1:1 PNG is drawn in.
    glass: ["#F29395", "#F8E4A1", "#9FEECF"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#65F3BA", at: 0 },
        { color: "#F4D87A", at: 50 },
        { color: "#F7787A", at: 100 },
      ],
    },
  },
  // Societas (JAVA-1616): the owner's seal. Its stops are dark on the right, so the chroma test decides
  // whether black or white ink reads on it.
  societas: {
    icon: "building-complex",
    // Reversed from the order given (CEFFFF, 7DF6C6, 437EFF) to the order its 1:1 PNG is drawn in.
    glass: ["#437EFF", "#7DF6C6", "#CEFFFF"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#C2FFFF", at: 0 },
        { color: "#00FF99", at: 50 },
        { color: "#0051FF", at: 100 },
      ],
    },
  },
  // Album (JAVA-1578, chroma JAVA-2087): light stops, so black ink clears 4.5:1 on every one (the chroma test pins it).
  album: {
    // `book-image`, not `image`: the glyph of the user's 1:1 PNG (2026-10-22).
    icon: "book-image",
    glass: ["#FF78CE", "#FCE9AA", "#FFFFFF"],
    gradient: {
      angle: 90,
      stops: [
        { color: "#FF78CE", at: 0 },
        { color: "#FFB3DA", at: 50 },
        { color: "#FCE9AA", at: 100 },
      ],
    },
  },

  // Agora (2026-10-22): born with the glass chroma and nothing else. Its `gradient`, which the
  // accent and the spinner read, is those same two colors; its glyph is the pyramid of the
  // user's 1:1 PNG.
  agora: {
    icon: "pyramid",
    gradient: {
      angle: 90,
      stops: [
        { color: "#DDE9FF", at: 0 },
        { color: "#A9A9A9", at: 100 },
      ],
    },
    // Reversed from the order given (DDE9FF, A9A9A9) to the order its 1:1 PNG is drawn in.
    glass: ["#A9A9A9", "#DDE9FF"],
  },

  // APIs — circle (shape: "circle"), their category's gradient.
  "seo-brain": {
    shape: "circle",
    icon: "brain",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FF9EDF", at: 0 },
        { color: "#DD7AB9", at: 50 },
        { color: "#B50E75", at: 100 },
      ],
    },
    surfaceNoise: {
      grain: 1.18,
      layers: [
        { color: "#EF8550", opacity: 0.25 },
        { color: "#FA581D", opacity: 0.25 },
      ],
    },
  },
  "email-validate": {
    shape: "circle",
    icon: "mail",
    gradient: {
      angle: 90,
      stops: [
        { color: "#5AB8FF", at: 0 },
        { color: "#3E8BFF", at: 50 },
        { color: "#2E5BFF", at: 100 },
      ],
    },
  },
  "phone-validate": {
    shape: "circle",
    icon: "smartphone",
    gradient: {
      angle: 90,
      stops: [
        { color: "#C79BFF", at: 0 },
        { color: "#9A6DFF", at: 50 },
        { color: "#6E3FE0", at: 100 },
      ],
    },
  },
  "verify-security-code": {
    shape: "circle",
    icon: "shield-check",
    gradient: {
      angle: 90,
      stops: [
        { color: "#C79BFF", at: 0 },
        { color: "#9A6DFF", at: 50 },
        { color: "#6E3FE0", at: 100 },
      ],
    },
  },
  "verify-issue-code": {
    shape: "circle",
    icon: "key-round",
    gradient: {
      angle: 90,
      stops: [
        { color: "#C79BFF", at: 0 },
        { color: "#9A6DFF", at: 50 },
        { color: "#6E3FE0", at: 100 },
      ],
    },
  },
  "text-normalize": {
    shape: "circle",
    icon: "type",
    gradient: {
      angle: 90,
      stops: [
        { color: "#5AE2D7", at: 0 },
        { color: "#2BC4B6", at: 50 },
        { color: "#179c8f", at: 100 },
      ],
    },
  },
  "bad-word-filter": {
    shape: "circle",
    icon: "filter",
    gradient: {
      angle: 90,
      stops: [
        { color: "#5AE2D7", at: 0 },
        { color: "#2BC4B6", at: 50 },
        { color: "#179c8f", at: 100 },
      ],
    },
  },
  "html-clean": {
    shape: "circle",
    icon: "code",
    gradient: {
      angle: 90,
      stops: [
        { color: "#5AE2D7", at: 0 },
        { color: "#2BC4B6", at: 50 },
        { color: "#179c8f", at: 100 },
      ],
    },
  },
  "qr-code": {
    shape: "circle",
    icon: "qr-code",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FF9EDF", at: 0 },
        { color: "#DD7AB9", at: 50 },
        { color: "#B50E75", at: 100 },
      ],
    },
  },
  "image-resize": {
    shape: "circle",
    icon: "image",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FF9EDF", at: 0 },
        { color: "#DD7AB9", at: 50 },
        { color: "#B50E75", at: 100 },
      ],
    },
  },
  "ua-lookup": {
    shape: "circle",
    icon: "globe",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FFCD50", at: 0 },
        { color: "#FFAE42", at: 50 },
        { color: "#FF8A00", at: 100 },
      ],
    },
  },
  "ocr-extract": {
    shape: "circle",
    icon: "scan-text",
    gradient: {
      angle: 90,
      stops: [
        { color: "#8B93FF", at: 0 },
        { color: "#6366F1", at: 50 },
        { color: "#4338CA", at: 100 },
      ],
    },
  },
  "ocr-extract-pdf": {
    shape: "circle",
    icon: "file-scan",
    gradient: {
      angle: 90,
      stops: [
        { color: "#8B93FF", at: 0 },
        { color: "#6366F1", at: 50 },
        { color: "#4338CA", at: 100 },
      ],
    },
  },

  /* The nine Products that had no seal yet (added 2026-08-11).
   *
   * Until now, the landing's `ApiProductCard` painted a Lucide icon inside a
   * gradient ring for them, and that ring was the same for the whole family: a
   * placeholder posing as the brand of nine products. It's axis 3 of
   * `doc://contracts/art-direction` —the brand carries the brand—
   * and step 3 of the landing's publishing checklist, which was declared
   * optional and that's exactly why nobody was doing it.
   *
   * Each one's gradient is ITS FAMILY's (`API_CATEGORIES` in
   * `javadaba-landing/src/lib/products.ts`), which is where the ring already
   * came from: the color doesn't change, who paints it does. The icon IS
   * specific to each Product, which is what the per-family ring couldn't give. */

  // Employment and talent — green. None of them call a model; they're deterministic scores.
  "job-match": {
    shape: "circle",
    icon: "target",
    gradient: {
      angle: 90,
      stops: [
        { color: "#7CE7A8", at: 0 },
        { color: "#34C77B", at: 50 },
        { color: "#12855A", at: 100 },
      ],
    },
  },
  "cv-ats-score": {
    shape: "circle",
    icon: "file-check",
    gradient: {
      angle: 90,
      stops: [
        { color: "#7CE7A8", at: 0 },
        { color: "#34C77B", at: 50 },
        { color: "#12855A", at: 100 },
      ],
    },
  },
  "ghost-job-score": {
    shape: "circle",
    icon: "ghost",
    gradient: {
      angle: 90,
      stops: [
        { color: "#7CE7A8", at: 0 },
        { color: "#34C77B", at: 50 },
        { color: "#12855A", at: 100 },
      ],
    },
  },

  // Notifications and automation — coral. They go out under the identity of whoever calls them.
  "notify-dispatch": {
    shape: "circle",
    icon: "bell",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FFB39E", at: 0 },
        { color: "#FF7A5C", at: 50 },
        { color: "#E0431F", at: 100 },
      ],
    },
  },
  "mail-send": {
    shape: "circle",
    icon: "send",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FFB39E", at: 0 },
        { color: "#FF7A5C", at: 50 },
        { color: "#E0431F", at: 100 },
      ],
    },
  },
  "fluxor-task-intake": {
    shape: "circle",
    icon: "list-checks",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FFB39E", at: 0 },
        { color: "#FF7A5C", at: 50 },
        { color: "#E0431F", at: 100 },
      ],
    },
  },

  // Connected data — sky blue. The platform holds a resource of yours and serves it over HTTP.
  "db-query": {
    shape: "circle",
    icon: "database",
    gradient: {
      angle: 90,
      stops: [
        { color: "#7DD3FC", at: 0 },
        { color: "#38BDF8", at: 50 },
        { color: "#0369A1", at: 100 },
      ],
    },
  },
  "social-metrics": {
    shape: "circle",
    icon: "trending-up",
    gradient: {
      angle: 90,
      stops: [
        { color: "#7DD3FC", at: 0 },
        { color: "#38BDF8", at: 50 },
        { color: "#0369A1", at: 100 },
      ],
    },
  },

  // The SEO Brain package. It doesn't carry the "others" gray: it's the pink of
  // the engine it comes from, which is what anyone who already knows
  // `seo-brain` recognizes.
  "seo-package": {
    shape: "circle",
    icon: "package",
    gradient: {
      angle: 90,
      stops: [
        { color: "#FF9EDF", at: 0 },
        { color: "#DD7AB9", at: 50 },
        { color: "#B50E75", at: 100 },
      ],
    },
  },
};

export function brandEntry(brand: string): BrandEntry | undefined {
  return brandRegistry[brand];
}
